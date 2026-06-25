# websocket_pedido.py
import asyncio
import websockets
import json
import logging
import os
from typing import Set, Optional, Dict, Any
from datetime import datetime
from pedidosDropletModel import LePaponAPI
from registra_pedido import processar_json

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constantes
URL_BASE_API = "http://lepapon-unified.local"  # URL base da API local unificada
URL_BASE_API_REMOTE = "http://lepapon-unified.local"  # URL base da API remota
WEBSOCKET_URL = os.getenv("WEBSOCKET_URL", "ws://lepapon-unified.local:3001")
WEBSOCKET_TOKEN = os.getenv(
    "WEBSOCKET_TOKEN",
    "cca4fb7a6e655314b83897adf54f41d24c5a5bd60aab4e0175071b7a49150a51",
)  # Preferir variável de ambiente
                   
PING_INTERVAL = 20  # segundos
PING_TIMEOUT = 30  # segundos
RECONNECT_DELAY = 5  # segundos
DELAY_BUSCAR_PEDIDO = 5  # segundos
DELAY_ANTES_PROCESSAR = 2  # segundos

# Controle de pedidos processados (evita duplicatas)
pedidos_processados: Set[str] = set()

# Métricas
class Metricas:
    def __init__(self):
        self.total_mensagens = 0
        self.pedidos_processados_sucesso = 0
        self.pedidos_processados_falha = 0
        self.reconexoes = 0
        self.inicio = datetime.now()
    
    def log_status(self):
        uptime = datetime.now() - self.inicio
        logger.info(f"📊 Métricas - Uptime: {uptime} | Mensagens: {self.total_mensagens} | "
                   f"Sucesso: {self.pedidos_processados_sucesso} | "
                   f"Falhas: {self.pedidos_processados_falha} | "
                   f"Reconexões: {self.reconexoes}")

metricas = Metricas()

# Inicialização da API
api = LePaponAPI(URL_BASE_API_REMOTE)


def _criar_chave_pedido(session_id: str, timestamp: Optional[str] = None) -> str:
    """
    Cria uma chave única para identificar um pedido processado.
    
    Args:
        session_id: ID da sessão (telefone do cliente)
        timestamp: Timestamp opcional para maior especificidade
        
    Returns:
        String única representando o pedido
    """
    if timestamp:
        return f"{session_id}_{timestamp}"
    return f"{session_id}_{datetime.now().strftime('%Y%m%d%H%M')}"


def _ja_processado(chave: str) -> bool:
    """
    Verifica se um pedido já foi processado.
    
    Args:
        chave: Chave única do pedido
        
    Returns:
        True se já foi processado, False caso contrário
    """
    return chave in pedidos_processados


def _marcar_como_processado(chave: str) -> None:
    """
    Marca um pedido como processado.
    
    Args:
        chave: Chave única do pedido
    """
    pedidos_processados.add(chave)
    # Limita o tamanho do set para evitar uso excessivo de memória
    if len(pedidos_processados) > 1000:
        # Remove os 100 mais antigos
        for _ in range(100):
            pedidos_processados.pop()
    logger.debug(f"Pedido marcado como processado: {chave}")


async def _processar_pedido(session_id: str, dados: Optional[Dict[str, Any]] = None) -> bool:
    """
    Processa um pedido: busca na API e registra no sistema.
    
    Args:
        session_id: ID da sessão (telefone do cliente)
        dados: Dados adicionais da mensagem (opcional)
        
    Returns:
        True se processado com sucesso, False caso contrário
    """
    try:
        # Cria chave única para evitar duplicatas
        chave_pedido = _criar_chave_pedido(session_id)
        
        if _ja_processado(chave_pedido):
            logger.warning(f"Pedido já processado anteriormente: {session_id}")
            return False
        
        logger.info(f"Buscando pedido para telefone: {session_id}")
        await asyncio.sleep(DELAY_BUSCAR_PEDIDO)
        
        pedido = api.buscar_por_fone(session_id)
        
        if not pedido:
            logger.warning(f"Nenhum pedido encontrado para o telefone: {session_id}")
            return False
        
        logger.info(f"Pedido encontrado para {session_id}. Preparando para processar...")
        await asyncio.sleep(DELAY_ANTES_PROCESSAR)
        
        # Converte pedido para JSON string se necessário
        if isinstance(pedido, (list, dict)):
            pedido_json = json.dumps(pedido)
        else:
            pedido_json = pedido
        
        # Processa o pedido
        resultado = processar_json(pedido_json)
        
        if resultado and resultado.get('sucesso'):
            logger.info(f"✅ Pedido processado com sucesso: {session_id}")
            logger.info(f"   {resultado.get('mensagem')}")
            _marcar_como_processado(chave_pedido)
            metricas.pedidos_processados_sucesso += 1
            return True
        else:
            mensagem_erro = resultado.get('mensagem') if resultado else 'Erro desconhecido'
            logger.error(f"❌ Falha ao processar pedido: {session_id}")
            logger.error(f"   {mensagem_erro}")
            metricas.pedidos_processados_falha += 1
            return False
            
    except json.JSONDecodeError as e:
        logger.error(f"Erro ao decodificar JSON do pedido: {str(e)}")
        metricas.pedidos_processados_falha += 1
        return False
    except Exception as e:
        logger.error(f"Erro inesperado ao processar pedido: {str(e)}", exc_info=True)
        metricas.pedidos_processados_falha += 1
        return False


async def listen_custom_messages():
    """
    Escuta mensagens do WebSocket e processa pedidos em tempo real.
    Mantém conexão persistente com reconexão automática.
    """
    uri = f"{WEBSOCKET_URL}?token={WEBSOCKET_TOKEN}"
    
    logger.info(f"🚀 Iniciando cliente WebSocket...")
    logger.info(f"📡 Conectando a: {WEBSOCKET_URL}")
    
    while True:
        try:
            async with websockets.connect(
                uri,
                ping_interval=PING_INTERVAL,
                ping_timeout=PING_TIMEOUT
            ) as websocket:
                logger.info("✅ Conectado ao WebSocket com sucesso!")
                metricas.log_status()
                
                async for message in websocket:
                    try:
                        data = json.loads(message)
                        event = data.get('event')
                        payload = data.get('data', {})
                        
                        metricas.total_mensagens += 1
                        
                        # Processa mensagens customizadas (pedidos)
                        if event == 'new_order':
                            session_id = payload.get('session_id')
                            dados_adicionais = payload.get('novo')
                            
                            logger.info(f"📨 Nova mensagem customizada recebida")
                            logger.info(f"   Sessão: {session_id}")
                            
                            if session_id:
                                await _processar_pedido(session_id, dados_adicionais)
                            else:
                                logger.warning("Mensagem sem session_id - ignorando")
                        
                        # Log de atualizações de sessão
                        elif event == 'session_update':
                            session_id = payload.get('session_id')
                            logger.info(f"🔄 Atualização de sessão: {session_id}")
                            logger.debug(f"   Detalhes: {json.dumps(payload.get('novo'), indent=2)}")
                        
                        # Log de notificações
                        elif event == 'session_notification':
                            session_id = payload.get('session_id')
                            logger.info(f"🔔 Notificação recebida: {session_id}")
                            logger.debug(f"   Conteúdo: {json.dumps(payload.get('novo'), indent=2)}")
                        
                        # Evento desconhecido
                        else:
                            logger.debug(f"📬 Evento desconhecido: {event}")
                        
                        # Log de métricas a cada 50 mensagens
                        if metricas.total_mensagens % 50 == 0:
                            metricas.log_status()
                    
                    except json.JSONDecodeError as e:
                        logger.error(f"Erro ao decodificar mensagem JSON: {str(e)}")
                    except Exception as e:
                        logger.error(f"Erro ao processar mensagem: {str(e)}", exc_info=True)

        except websockets.exceptions.ConnectionClosed as e:
            metricas.reconexoes += 1
            logger.warning(f"🔌 Conexão WebSocket fechada: {e}")
            logger.info(f"⏳ Tentando reconectar em {RECONNECT_DELAY} segundos...")
            await asyncio.sleep(RECONNECT_DELAY)
        
        except websockets.exceptions.WebSocketException as e:
            metricas.reconexoes += 1
            logger.error(f"❌ Erro no WebSocket: {str(e)}")
            logger.info(f"⏳ Tentando reconectar em {RECONNECT_DELAY} segundos...")
            await asyncio.sleep(RECONNECT_DELAY)
        
        except Exception as e:
            metricas.reconexoes += 1
            logger.error(f"❌ Erro inesperado: {str(e)}", exc_info=True)
            logger.info(f"⏳ Tentando reconectar em {RECONNECT_DELAY} segundos...")
            await asyncio.sleep(RECONNECT_DELAY)


if __name__ == "__main__":
    try:
        logger.info("=" * 60)
        logger.info("🎯 Cliente WebSocket LePapon - Processador de Pedidos")
        logger.info("=" * 60)
        asyncio.run(listen_custom_messages())
    except KeyboardInterrupt:
        logger.info("\n⚠️  Interrompido pelo usuário")
        metricas.log_status()
        logger.info("👋 Encerrando cliente WebSocket...")
    except Exception as e:
        logger.error(f"Erro fatal: {str(e)}", exc_info=True)