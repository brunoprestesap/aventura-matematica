import { test, expect } from "@playwright/test";

test.describe("Fluxo do quiz", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("usuário completa uma rodada de quiz e vê o resultado", async ({ page }) => {
    // Tela de nome
    await expect(page.getByText(/Bem-vindo ao Continha Mágica!/i)).toBeVisible();
    await page.getByLabel(/Seu nome/i).fill("Ana Teste");
    await page.getByRole("button", { name: /Começar a magia/i }).click();

    // Tela de seleção de ano
    await expect(page.getByText(/Em qual ano você está\?/i)).toBeVisible();
    await page.getByRole("button", { name: /4º ano/i }).click();

    // Quiz carregou
    await expect(page.getByText(/Hora de praticar!/i)).toBeVisible();
    await expect(page.getByText(/4º ano/i)).toBeVisible();

    // Preenche as 20 respostas com "1" (provavelmente errado, mas preenche)
    const inputs = page.locator('input[aria-label^="Resposta para a questão"]').nth(0);
    await expect(inputs).toBeVisible();

    const allInputs = page.locator('input[aria-label^="Resposta para a questão"]');
    const count = await allInputs.count();
    expect(count).toBe(20);

    for (let i = 0; i < count; i++) {
      await allInputs.nth(i).fill("1");
    }

    // Verifica respostas
    await page.getByRole("button", { name: /Verificar respostas/i }).click();

    // Resultado aparece
    await expect(page.getByText(/Você acertou/i)).toBeVisible();

    // Histórico reflete a atividade
    await page.getByRole("button", { name: /Histórico/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/4º ano/i).first()).toBeVisible();
    // Fecha clicando no overlay
    await page.mouse.click(10, 10);
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Novas questões
    await page.getByRole("button", { name: /Novas questões/i }).click();
    await expect(page.getByText(/Hora de praticar!/i)).toBeVisible();
  });
});
