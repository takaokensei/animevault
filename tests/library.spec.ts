import { test, expect } from '@playwright/test';

test.describe('AnimeVault E2E Test Suite', () => {
  test('deve carregar a biblioteca e exibir elementos de busca', async ({ page }) => {
    // Navegar para o app local
    await page.goto('/');

    // Verificar se o titulo ou barra de busca esta presente
    const searchInput = page.locator('input[placeholder="Buscar na sua biblioteca..."]');
    await expect(searchInput).toBeVisible();
  });

  test('deve navegar para a pagina de Perfil e interagir com Zenith SaaS Cloud Sync', async ({ page }) => {
    // Carrega a página inicial para inicializar o domínio
    await page.goto('/');

    // Injeta a sessão mockada do MyAnimeList no localStorage do Zustand
    await page.evaluate(() => {
      const mockState = {
        state: {
          accessToken: 'mock_access_token_e2e',
          refreshToken: 'mock_refresh_token_e2e',
          isLoggedIn: true,
          userProfile: {
            id: 123456,
            name: 'Playwright E2E Tester',
            picture: 'https://api.dicebear.com/7.x/bottts/svg?seed=tester'
          }
        },
        version: 0
      };
      localStorage.setItem('auth-storage', JSON.stringify(mockState));
    });

    // Navegar diretamente para /profile (que o router gerencia)
    await page.goto('/profile');

    // Verificar se o card do Zenith SaaS está visível
    const saasHeader = page.locator('text=Ativar Zenith Cloud Sync');
    await expect(saasHeader).toBeVisible();

    // Preencher formulário de ativação do SaaS
    await page.fill('input[placeholder="Ex: Cauã Vitor"]', 'Playwright Test User');
    await page.fill('input[placeholder="nome@dominio.com"]', 'test-saas@zenith.inc');
    
    // Clicar em Conectar Nuvem
    await page.click('text=Conectar Nuvem');

    // Verificar se a conta Zenith foi ativada com sucesso e mostra o status "Cloud Active"
    const cloudStatus = page.locator('text=Cloud Active');
    await expect(cloudStatus).toBeVisible();
    
    // Verificar se o nome cadastrado está aparecendo
    const registeredName = page.locator('text=Playwright Test User');
    await expect(registeredName).toBeVisible();
  });
});
