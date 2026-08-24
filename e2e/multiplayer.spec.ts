import { test, expect } from '@playwright/test';

test.describe('Galeria de Defensores - Multiplayer Realtime E2E Flow', () => {
  test('should synchronize chat messages and dice rolls between Master and Player', async ({ browser }) => {
    // 1. Configurar contexto do Mestre (User A)
    const masterContext = await browser.newContext();
    const masterPage = await masterContext.newPage();
    const masterSession = JSON.stringify({
      user_id: 'd8f0153c-cd2a-4ca6-bd6e-a632fc29e981',
      email: 'fiecruz@gmail.com',
      username: 'fecruz'
    });
    await masterContext.addCookies([{
      name: 'gdd-mock-session',
      value: encodeURIComponent(masterSession),
      domain: 'localhost',
      path: '/'
    }]);

    // 2. Configurar contexto do Jogador (User B)
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    const playerSession = JSON.stringify({
      user_id: 'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0',
      email: 'jogador_alpha@example.com',
      username: 'Jogador_Alpha'
    });
    await playerContext.addCookies([{
      name: 'gdd-mock-session',
      value: encodeURIComponent(playerSession),
      domain: 'localhost',
      path: '/'
    }]);

    // Log de console para depuração e ponte de sincronização realtime E2E
    masterPage.on('console', async (msg) => {
      const text = msg.text();
      console.log('MASTER BROWSER:', text);
      if (text.startsWith('[MOCK REALTIME] database insert on:')) {
        const match = text.match(/database insert on:\s+(\w+)\s+(.+)$/);
        if (match) {
          const table = match[1];
          try {
            const record = JSON.parse(match[2]);
            await playerPage.evaluate(({ table, record }) => {
              if ((window as any).__supabaseMockRealtimeTrigger) {
                (window as any).__supabaseMockRealtimeTrigger(table, 'INSERT', record);
              }
            }, { table, record });
          } catch (e) {
            console.error('Failed to parse database insert JSON on Master page:', e);
          }
        }
      }
    });

    playerPage.on('console', async (msg) => {
      const text = msg.text();
      console.log('PLAYER BROWSER:', text);
      if (text.startsWith('[MOCK REALTIME] database insert on:')) {
        const match = text.match(/database insert on:\s+(\w+)\s+(.+)$/);
        if (match) {
          const table = match[1];
          try {
            const record = JSON.parse(match[2]);
            await masterPage.evaluate(({ table, record }) => {
              if ((window as any).__supabaseMockRealtimeTrigger) {
                (window as any).__supabaseMockRealtimeTrigger(table, 'INSERT', record);
              }
            }, { table, record });
          } catch (e) {
            console.error('Failed to parse database insert JSON on Player page:', e);
          }
        }
      }
    });

    // 3. Mestre entra no Dashboard e acessa a Mesa
    await masterPage.goto('/dashboard');
    await masterPage.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(masterPage.locator('h2', { hasText: 'Saudações, fecruz!' })).toBeVisible({ timeout: 10000 });

    // Navega para a mesa de jogo (VTT)
    await masterPage.goto('/tables/mock-table-id');
    await masterPage.waitForURL('**/tables/mock-table-id', { timeout: 10000 });
    await expect(masterPage.locator('h1').first()).toContainText('Table E2E');

    // 4. Jogador entra na mesma Mesa de Jogo (VTT)
    await playerPage.goto('/tables/mock-table-id');
    await playerPage.waitForURL('**/tables/mock-table-id', { timeout: 10000 });
    await expect(playerPage.locator('h1').first()).toContainText('Table E2E');

    // Aguardar a hidratação de ambos os lados e registro dos listeners do realtime
    await masterPage.waitForTimeout(2000);
    await playerPage.waitForTimeout(2000);

    // 5. Mestre envia uma mensagem de boas-vindas no chat
    const masterChatInput = masterPage.locator('input[placeholder*="Mensagem no chat"]');
    await masterChatInput.fill('Saudações, defensores! Sejam bem-vindos.');
    await masterPage.keyboard.press('Enter');

    // Jogador deve receber a mensagem do Mestre em tempo real
    const playerChatFeed = playerPage.locator('div', { hasText: 'Saudações, defensores!' });
    await expect(playerChatFeed.first()).toBeVisible({ timeout: 10000 });

    // 6. Jogador responde no chat
    const playerChatInput = playerPage.locator('input[placeholder*="Mensagem no chat"]');
    await playerChatInput.fill('Obrigado, Mestre! Preparado para a aventura.');
    await playerPage.keyboard.press('Enter');

    // Mestre deve receber a resposta em tempo real
    const masterChatFeed = masterPage.locator('div', { hasText: 'Obrigado, Mestre!' });
    await expect(masterChatFeed.first()).toBeVisible({ timeout: 10000 });

    // 7. Mestre realiza uma rolagem de dados
    const rollButton = masterPage.locator('button', { hasText: 'Rolar Dados na Mesa' });
    await expect(rollButton).toBeVisible();
    await rollButton.click();

    // Aguardar o overlay do dado estar montado e visível
    await expect(masterPage.locator('text=Segure e arremesse os dados para rolar!')).toBeVisible({ timeout: 5000 });

    // Pressionar Escape para concluir a animação instantaneamente (recurso de skip UX via teclado)
    await masterPage.keyboard.press('Escape');

    // Jogador deve visualizar o feed da rolagem de dados em tempo real
    const playerRollFeed = playerPage.locator('div', { hasText: 'rolou' });
    await expect(playerRollFeed.first()).toBeVisible({ timeout: 15000 });

    // Fechar contextos
    await masterContext.close();
    await playerContext.close();
  });
});
