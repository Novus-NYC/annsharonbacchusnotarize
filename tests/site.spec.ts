import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const filmEnd = (page: Page) =>
  page.evaluate(() => {
    const f = document.querySelector<HTMLElement>(".film")!;
    return f.offsetTop + f.offsetHeight - window.innerHeight;
  });

test("loads cleanly, with every asset self-hosted", async ({ page }) => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Ann Sharon\s*Bacchus/);
  await expect(page.locator(".ledger__row")).toHaveCount(6);
  await page.waitForLoadState("networkidle");

  const external = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .filter((n) => !n.startsWith(location.origin) && !n.startsWith("blob:")),
  );
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test("contact actions dial, text and email the right places", async ({ page }) => {
  await page.goto("/");
  const contact = page.locator("#contact");
  await expect(contact.getByRole("link", { name: "347-564-5172" })).toHaveAttribute("href", "tel:+13475645172");
  await expect(contact.getByRole("link", { name: "Send a text" })).toHaveAttribute("href", "sms:+13475645172");
  await expect(contact.getByRole("link", { name: "annsharonbacchus@gmail.com" })).toHaveAttribute(
    "href",
    "mailto:annsharonbacchus@gmail.com",
  );
});

test("scrolling scrubs the film to the sealed document", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".film")).toHaveClass(/film--ready/, { timeout: 15000 });
  const end = await filmEnd(page);
  for (let y = 0; y <= end; y += 400) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(30);
  }
  await expect
    .poll(() => page.evaluate(() => {
      const v = document.querySelector<HTMLVideoElement>(".film__video")!;
      return v.currentTime / v.duration;
    }), { timeout: 5000 })
    .toBeGreaterThan(0.97);
  await expect(page.locator(".cert__line")).toContainText(/day of \w+, \d{4}/);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("shows the static page and never downloads the film", async ({ page }) => {
    const videos: string[] = [];
    page.on("request", (r) => r.url().endsWith(".mp4") && videos.push(r.url()));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => document.documentElement.classList.contains("motion"))).toBe(false);
    await expect(page.locator(".film__poster--end img")).toBeVisible();
    await expect(page.locator(".cert__line")).toBeVisible();
    expect(videos).toEqual([]);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("all content is readable", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".film__poster--end img")).toBeVisible();
    for (const id of ["services", "mobile", "about", "faq", "real-estate", "contact"]) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await expect(page.locator(`#${id} h2`)).toBeVisible();
    }
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("loads the portrait cut and never scrolls sideways", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".film")).toHaveAttribute("data-variant", "tall");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test("has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
});

test.describe("contrast on static pages", () => {
  test.use({ reducedMotion: "reduce" });
  test("text meets WCAG AA contrast", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // The hero copy sits on video/imagery behind a scrim, which axe can't measure.
    const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).exclude(".film").analyze();
    expect(results.violations.map((v) => v.nodes.map((n) => n.target).join(", "))).toEqual([]);
  });
});
