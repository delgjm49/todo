import { expect, type Page, test } from "@playwright/test";

const STORAGE_PREFIX = "todo-app::";

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

test.describe("core UX fixes", () => {
  test("workspace list scrolls when many workspaces exist", async ({ page }) => {
    await resetTodoStorage(page);

    // Create enough workspaces to overflow the dock
    for (let i = 0; i < 15; i++) {
      await page.getByRole("button", { name: "+ Workspace" }).click();
    }
    await expect(page.getByRole("heading", { name: /Workspace/ })).toBeVisible();

    // The workspace list scroll container should be present
    const scrollContainer = page.getByTestId("workspace-list-scroll");
    await expect(scrollContainer).toBeVisible();

    // Scroll down and verify a later workspace is reachable
    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(page.getByRole("button", { name: "Workspace 15" })).toBeVisible();
  });

  test("main canvas scrolls when many blocks exist", async ({ page }) => {
    await resetTodoStorage(page);

    // Add multiple blocks to fill the canvas
    await page.getByRole("button", { name: "Add Checklist" }).click();
    await page.getByRole("button", { name: "Add Bullet list" }).click();
    await page.getByRole("button", { name: "Add Numbered list" }).click();
    await page.getByRole("button", { name: "Add Checklist" }).click();
    await page.getByRole("button", { name: "Add Bullet list" }).click();

    // The canvas section (MainPane) is a scrollable container
    const canvas = page.locator("section").filter({ hasText: "Workspace canvas" }).first();
    await expect(canvas).toBeVisible();

    // Verify all blocks are rendered
    await expect(page.getByTestId(/^block-card-/)).toHaveCount(5);

    // Scroll down and verify the last block is reachable
    await canvas.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(page.getByRole("button", { name: "Add another block" })).toBeVisible();
  });

  test("workspace context-menu rename works", async ({ page }) => {
    await resetTodoStorage(page);

    // Open the workspace context menu via right-click on the workspace card
    const homeButton = page.getByRole("button", { name: "Home" });
    await homeButton.click({ button: "right" });

    // Handle the prompt dialog
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Rename workspace");
      await dialog.accept("My Renamed Workspace");
    });

    await page.getByText("Rename workspace").click();
    await expect(page.getByRole("button", { name: "My Renamed Workspace" })).toBeVisible();
  });

  test("workspace context-menu delete works with confirm", async ({ page }) => {
    await resetTodoStorage(page);

    // Create an extra workspace so deleting Home leaves one
    await page.getByRole("button", { name: "+ Workspace" }).click();

    const homeButton = page.getByRole("button", { name: "Home" });
    await homeButton.click({ button: "right" });

    // Handle the confirm dialog
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Delete workspace");
      await dialog.accept();
    });

    await page.getByText("Delete workspace").click();
    await expect(page.getByText("Home")).not.toBeVisible();
  });

  test("block sort button and menu button show different content", async ({ page }) => {
    await resetTodoStorage(page);

    await expect(page.getByTestId(/^sort-menu-/)).toBeVisible();
    await expect(page.getByText("Menu")).toBeVisible();

    // Click the Sort button - should show sort-only options
    await page.getByTestId(/^sort-menu-/).first().click();
    await expect(page.getByText("Sort by")).toBeVisible();
    // Sort menu should show Asc/Desc, not block actions
    await expect(page.getByText("Asc")).toBeVisible();
    await expect(page.getByText("Desc")).toBeVisible();
    await expect(page.getByText("Rename block")).not.toBeVisible();

    // Close sort menu by clicking somewhere else
    await page.locator("body").click({ position: { x: 0, y: 0 } });

    // Click the Menu button - should show block actions
    await page.getByText("Menu").first().click();
    await expect(page.getByText("Rename block")).toBeVisible();
    await expect(page.getByText("Collapse block")).toBeVisible();
    await expect(page.getByText("Delete block")).toBeVisible();
  });
});
