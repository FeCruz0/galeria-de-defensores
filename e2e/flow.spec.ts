import { test, expect } from '@playwright/test';

test.describe('Galeria de Defensores Complete E2E Flow', () => {
  const timestamp = Date.now();
  const characterName = `Hero_E2E_${timestamp}`;
  const tableName = `Table_E2E_${timestamp}`;

  test('should bypass auth using mock cookie, create character, download PDF, create table, and roll dice', async ({ page }) => {
    // Define o cookie de sessão mockada apontando para um usuário válido no banco (fecruz)
    const cookieValue = JSON.stringify({
      user_id: 'd8f0153c-cd2a-4ca6-bd6e-a632fc29e981',
      email: 'fiecruz@gmail.com',
      username: 'fecruz'
    });
    
    await page.context().addCookies([{
      name: 'gdd-mock-session',
      value: encodeURIComponent(cookieValue),
      domain: 'localhost',
      path: '/'
    }]);

    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

    // 1. Acessa o Dashboard
    await page.goto('/dashboard');
    console.log('BROWSER COOKIES:', await page.evaluate(() => document.cookie));
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Verifica se a barra ou título do Painel está presente
    const dashboardHeader = page.locator('h2', { hasText: 'Saudações, fecruz!' });
    await expect(dashboardHeader).toBeVisible({ timeout: 10000 });

    // 2. Criação de Personagem
    await page.goto('/characters/new');
    await page.fill('input[type="text"]', characterName);
    await page.fill('input[type="text"] >> nth=1', 'Combatente E2E'); // Conceito/Classe
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento para a Ficha do Personagem
    await page.waitForURL(/\/characters\/.+/, { timeout: 15000 });
    await expect(page.locator('h1').first()).toContainText('Hero E2E');

    // 3. Exportação e Download de Ficha em PDF
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button[title="Exportar PDF com Backup de Dados Embutido"]'),
    ]);
    expect(download.suggestedFilename()).toContain('.pdf');

    // 4. Criação de Mesa de Jogo
    await page.goto('/tables/new');
    await page.fill('input[type="text"]', tableName);
    await page.fill('input[type="password"]', 'tablepass123');
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento para a Mesa de Jogo (VTT)
    await page.waitForURL(/\/tables\/.+/, { timeout: 15000 });
    await expect(page.locator('h1').first()).toContainText('Table E2E');

    // 5. Rolar Dados na Mesa (VTT)
    const rollButton = page.locator('button', { hasText: 'Rolar Dados na Mesa' });
    await expect(rollButton).toBeVisible();
    await rollButton.click();

    // Validar que o feed de chat agora contém uma mensagem indicando a rolagem
    const chatFeed = page.locator('div', { hasText: 'Rolagem de Dados' });
    await expect(chatFeed.first()).toBeVisible();
  });
});
