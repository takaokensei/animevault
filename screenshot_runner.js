const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('Navegando para o app local...');
  try {
    await page.goto('http://localhost:1420/');
    await page.waitForTimeout(3000);

    // Captura antes de logar
    const p1 = 'C:\\Users\\Cauã V\\.gemini\\antigravity\\brain\\fc639bcb-d787-4602-9b0c-1db46c6761dc\\screenshot_before_login.png';
    await page.screenshot({ path: p1 });
    console.log('Screenshot pre-login salva em:', p1);

    // Procura o botão de login com MAL e clica
    const loginButton = page.locator('text=Entrar com MAL');
    if (await loginButton.count() > 0) {
      await loginButton.click();
      console.log('Botão clicado, aguardando simulação do login mock...');
      await page.waitForTimeout(5000);
      
      // Captura depois de logar
      const p2 = 'C:\\Users\\Cauã V\\.gemini\\antigravity\\brain\\fc639bcb-d787-4602-9b0c-1db46c6761dc\\screenshot_after_login.png';
      await page.screenshot({ path: p2 });
      console.log('Screenshot pos-login salva em:', p2);
    } else {
      console.log('Botão de login não encontrado. Já logado ou interface diferente.');
    }
  } catch (err) {
    console.error('Erro na navegação do Playwright:', err);
  } finally {
    await browser.close();
  }
})();
