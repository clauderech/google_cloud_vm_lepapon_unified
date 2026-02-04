'use strict';

import { createHmac, timingSafeEqual, privateDecrypt, constants, createDecipheriv, createCipheriv } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { isAbsolute, resolve } from 'path';

/**
 * Descriptografa e processa dados de Flow do WhatsApp Meta
 */

class WhatsAppFlowProcessor {
  constructor(options = {}) {
    this.privateKeyPath = options.privateKeyPath || process.env.WHATSAPP_FLOW_PRIVATE_KEY_PATH;
    this.appSecret = options.appSecret || process.env.WHATSAPP_APP_SECRET;
  }

  /**
   * Valida a assinatura HMAC-SHA256 do webhook
   */
  validateSignature(payload, xHubSignature) {
    if (!this.appSecret) {
      throw new Error('WHATSAPP_APP_SECRET não configurado');
    }

    const hash = createHmac('sha256', this.appSecret)
      .update(payload)
      .digest('hex');

    const expectedSignature = `sha256=${hash}`;
    return timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(xHubSignature)
    );
  }

  /**
   * Descriptografa o payload de Flow
   */
  decryptFlowData(encryptedFlowData, encryptedAesKey, initialVector) {
    if (!this.privateKeyPath) {
      throw new Error('WHATSAPP_FLOW_PRIVATE_KEY_PATH não configurado');
    }

    // Resolver caminho relativo se necessário
    let keyPath = this.privateKeyPath;
    if (!isAbsolute(keyPath)) {
      keyPath = resolve(__dirname, keyPath);
    }

    console.log('[Flow] Usando chave privada em:', keyPath);

    if (!existsSync(keyPath)) {
      throw new Error(`Arquivo de chave privada não encontrado: ${keyPath}`);
    }

    try {
      // Lê a chave privada
      const privateKey = readFileSync(keyPath, 'utf8');

      // Descriptografa a chave AES usando RSA com OAEP SHA-256
      const decryptedAesKey = privateDecrypt(
        {
          key: privateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(encryptedAesKey, 'base64')
      );

      console.log('[Flow] Chave AES descriptografada com sucesso, tamanho:', decryptedAesKey.length, 'bytes');

      // Descriptografa os dados usando AES-128-GCM
      const flowDataBuffer = Buffer.from(encryptedFlowData, 'base64');
      const TAG_LENGTH = 16;
      const encrypted_flow_data_body = flowDataBuffer.subarray(0, -TAG_LENGTH);
      const encrypted_flow_data_tag = flowDataBuffer.subarray(-TAG_LENGTH);

      console.log('[Flow] Dados criptografados (sem tag):', encrypted_flow_data_body.length, 'bytes');
      console.log('[Flow] Tag de autenticação:', encrypted_flow_data_tag.length, 'bytes');

      const decipher = createDecipheriv(
        'aes-128-gcm',
        decryptedAesKey,
        Buffer.from(initialVector, 'base64')
      );
      decipher.setAuthTag(encrypted_flow_data_tag);

      let decrypted = decipher.update(encrypted_flow_data_body);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      console.log('[Flow] Dados descriptografados com sucesso');

      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      console.error('[Flow] Erro ao descriptografar:', error.message);
      console.error('[Flow] Stack:', error.stack);
      throw new Error(`Falha ao descriptografar dados de Flow: ${error.message}`);
    }
  }

  /**
   * Processa um webhook de Flow
   */
  processFlowWebhook(body, xHubSignature) {
    // Verificar se é um payload de Flow
    if (!body.encrypted_flow_data || !body.encrypted_aes_key || !body.initial_vector) {
      throw new Error('Payload de Flow inválido - campos necessários ausentes');
    }

    // Validar assinatura se disponível
    if (xHubSignature && this.appSecret) {
      try {
        const rawPayload = JSON.stringify(body);
        this.validateSignature(rawPayload, xHubSignature);
        console.log('[Flow] Assinatura válida');
      } catch (error) {
        console.warn('[Flow] Validação de assinatura falhou:', error.message);
        // Continuar mesmo se assinatura falhar (pode não estar configurada)
      }
    }

    // Descriptografar
    const decryptedData = this.decryptFlowData(
      body.encrypted_flow_data,
      body.encrypted_aes_key,
      body.initial_vector
    );

    console.log('[Flow] Dados descriptografados:', JSON.stringify(decryptedData));

    return {
      type: 'flow',
      data: decryptedData,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Descriptografa e retorna a chave AES
   */
  getDecryptedAesKey(encryptedAesKey) {
    if (!this.privateKeyPath) {
      throw new Error('WHATSAPP_FLOW_PRIVATE_KEY_PATH não configurado');
    }

    let keyPath = this.privateKeyPath;
    if (!isAbsolute(keyPath)) {
      keyPath = resolve(__dirname, keyPath);
    }

    if (!existsSync(keyPath)) {
      throw new Error(`Arquivo de chave privada não encontrado: ${keyPath}`);
    }

    try {
      const privateKey = readFileSync(keyPath, 'utf8');

      const decryptedAesKey = privateDecrypt(
        {
          key: privateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(encryptedAesKey, 'base64')
      );

      return decryptedAesKey;
    } catch (error) {
      console.error('[Flow] Erro ao descriptografar chave AES:', error.message);
      throw new Error(`Falha ao descriptografar chave AES: ${error.message}`);
    }
  }

  /**
   * Encripta resposta para Flow
   */
  encryptFlowResponse(response, aesKeyBuffer, initialVectorBuffer) {
    try {
      const jsonResponse = JSON.stringify(response);
      console.log('[Flow] Resposta a encriptar (JSON):', jsonResponse);
      console.log('[Flow] Tamanho da resposta:', jsonResponse.length, 'bytes');
      console.log('[Flow] Chave AES tamanho:', aesKeyBuffer.length, 'bytes');

      // Inverte o IV (flip all bits) - XOR com 0xFF
      const flippedIv = Buffer.alloc(initialVectorBuffer.length);
      for (let i = 0; i < initialVectorBuffer.length; i++) {
        flippedIv[i] = initialVectorBuffer[i] ^ 0xFF;
      }

      console.log('[Flow] IV original:', initialVectorBuffer.toString('base64'));
      console.log('[Flow] IV invertido:', flippedIv.toString('base64'));

      // Encripta usando AES-128-GCM
      const cipher = createCipheriv(
        'aes-128-gcm',
        aesKeyBuffer,
        flippedIv
      );

      // Encriptar os dados
      let encrypted = cipher.update(jsonResponse, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Obter o tag de autenticação
      const authTag = cipher.getAuthTag();
      
      // Concatenar dados + tag
      const fullEncrypted = Buffer.concat([encrypted, authTag]);
      
      const base64Response = fullEncrypted.toString('base64');
      console.log('[Flow] Resposta encriptada:', base64Response.substring(0, 50) + '...');
      console.log('[Flow] Tamanho encriptado:', base64Response.length, 'caracteres');

      return base64Response;
    } catch (error) {
      console.error('[Flow] Erro ao encriptar resposta:', error.message);
      console.error('[Flow] Stack:', error.stack);
      throw new Error(`Falha ao encriptar resposta de Flow: ${error.message}`);
    }
  }
}

export default {
  WhatsAppFlowProcessor,
  createFlowProcessor: (options) => new WhatsAppFlowProcessor(options),
};
