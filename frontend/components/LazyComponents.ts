import { lazy } from 'react';

// Lazy load das páginas principais
export const Dashboard = lazy(() => import('./Dashboard'));
export const POS = lazy(() => import('./POS'));
export const Inventory = lazy(() => import('./Inventory'));
export const Customers = lazy(() => import('./Customers'));
export const Financial = lazy(() => import('./FinancialDashboard'));
export const Reports = lazy(() => import('./Reports'));

// Lazy load de componentes grandes
export const LoyaltyProgram = lazy(() => import('./LoyaltyProgram'));
export const Login = lazy(() => import('./Login'));

// Lazy load de utilities pesadas
export const Charts = lazy(() => import('./Charts'));
export const BusinessInsights = lazy(() => import('./BusinessInsights'));