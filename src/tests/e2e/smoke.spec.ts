import { expect, type Page, test } from "@playwright/test";

// This smoke targets the configured Vite renderer/browser Playwright boundary,
// not packaged Tauri desktop shell automation.
const STORAGE_PREFIX = "todo-app::";
const FIRST_TASK = "Smoke task alpha";
const SECOND_TASK = "Smoke task beta";

async function waitForAppReady(page: Page) {
  await expect(page.getByText("Workspace Dock")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Workspace" })).toBeVisible();
  await expect(page.getByText("Loading workspace")).toBeHidden();
}

async function resetTodoStorage(page: Page) {
  await page.goto("/");
  await page.evaluate((storagePrefix) => {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(storagePrefix)) {
        window.localStorage.removeItem(key);
      }
    }
  }, STORAGE_PREFIX);
  await page.reload();
  await waitForAppReady(page);
}

async function waitForSaved(page: Page) {
  await expect(page.getByText("Saved")).toBeVisible();
  await page.waitForFunction(
    ({ firstTask, secondTask, storagePrefix }) =>
      Object.entries(window.localStorage).some(
        ([key, value]) => key.startsWith(storagePrefix) && value.includes(firstTask) && value.includes(secondTask)
      ),
    { firstTask: FIRST_TASK, secondTask: SECOND_TASK, storagePrefix: STORAGE_PREFIX }
  );
}

test("creates checklist rows and persists them after reload", async ({ page }) => {
  await resetTodoStorage(page);

  await expect(page.getByRole("button", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Today" })).toBeVisible();
  await expect(page.getByTestId("workspace-block-count")).toHaveText("1");

  await page.getByRole("button", { name: "+ Workspace" }).click();
  await expect(page.getByRole("heading", { name: "Workspace 2" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Workspace 2" })).toBeVisible();

  await page.getByRole("button", { name: "Add Checklist" }).click();
  await expect(page.getByRole("button", { name: "Checklist" })).toBeVisible();
  await expect(page.getByText("Task")).toBeVisible();

  const textCells = page.getByTestId("text-cell-input");
  const checkboxCells = page.getByTestId("checkbox-cell-toggle");
  await expect(textCells).toHaveCount(1);
  await expect(checkboxCells).toHaveCount(1);
  await expect(page.getByTestId("workspace-block-count")).toHaveText("1");

  await textCells.first().fill(FIRST_TASK);
  await textCells.first().press("Enter");

  await page.getByRole("button", { name: "+ Row" }).click();
  await expect(textCells).toHaveCount(2);

  await textCells.nth(1).fill(SECOND_TASK);
  await textCells.nth(1).press("Enter");
  await checkboxCells.first().click();
  await expect(checkboxCells.first()).toHaveText("☑");
  await waitForSaved(page);

  await expect(textCells.first()).toHaveValue(FIRST_TASK);
  await expect(textCells.nth(1)).toHaveValue(SECOND_TASK);

  await page.reload();
  await waitForAppReady(page);
  await page.getByRole("button", { name: "Workspace 2" }).click();

  await expect(page.getByRole("button", { name: "Checklist" })).toBeVisible();
  await expect(textCells).toHaveCount(2);
  await expect(textCells.first()).toHaveValue(FIRST_TASK);
  await expect(textCells.nth(1)).toHaveValue(SECOND_TASK);
  await expect(checkboxCells.first()).toHaveText("☑");
});
