# Volta Website Build Standard

This repository is the starting point for bespoke client websites. Every build must feel intentionally art-directed for the particular business, not like a generic AI-generated landing page. `AGENTS.md` and `CLAUDE.md` are canonical mirrors: whenever either file changes, copy the exact same content to the other file in the same change.

## Core principle

Build a memorable, useful multi-page brand experience. The site should communicate the business's character quickly, make key actions easy, and reward scrolling with meaningful visual progression. A polished site is not defined by maximal effects. It is defined by a strong visual idea, hierarchy, real content, and small interactions that feel deliberate.

Before designing or coding, identify:

- The business's audience, desired action, personality, and practical conversion goals.
- What visual material is genuinely available: photography, logo, products, interiors, people, location, press, menus, or historical material.
- The differentiators that can drive the concept. Do not default to a trendy style before learning what makes the business distinct.
- The minimum page architecture needed for real user tasks.

Use those answers to form a concise art direction. It should name the visual tension or idea, such as warm editorial hospitality, industrial craft, bright local energy, or quiet luxury. That idea should guide layout, photography, typography, color, motion, and copy.

## Site architecture

Prefer a multi-page site. A homepage should introduce the brand and direct visitors to deeper information, rather than becoming an overly long page that tries to hold the entire business.

- Create dedicated routes for substantial content such as About, Services, Menu, Gallery, Events, Locations, Contact, FAQ, or Booking. Choose the pages the business actually needs.
- Keep the homepage focused: hero, primary value proposition, a few high-value previews, trust signals, and clear paths to deeper pages.
- Use anchors only for small in-page navigation or short supporting sections. Do not use anchor links as a substitute for real pages when a section needs its own story, search visibility, shareable URL, or content depth.
- Make every page purposeful. Do not add empty routes just to increase page count.
- Provide obvious next steps on every page: a primary conversion action plus relevant internal navigation.
- Preserve visual continuity across routes while giving each page a distinct composition or moment. Repeating the same hero and card grid on every page is not sufficient.

## Visual direction and layout

### Compose, do not assemble a template

- Start with a specific layout concept. Avoid the familiar sequence of centered headline, rounded gradient card, three feature cards, testimonial row, and oversized pill buttons unless it is uniquely justified by the brand.
- Use asymmetry, crop, scale contrast, editorial framing, layered type, image overlap, rhythm changes, or an unusual grid where they reinforce the business. Novelty must improve the story or orientation, not simply decorate the page.
- Each major section needs a job, a visual focal point, and a clear relationship to the sections before and after it.
- Mix composition types across the site: full-bleed image moments, constrained editorial content, split layouts, detail crops, data or service lists, and strong calls to action. Do not render the whole site as repeated cards.
- Prefer clean structural shapes and restrained border radius. Avoid indiscriminate floating panels, glass effects, soft shadows, excessive pills, and decorative gradients that make a site feel synthetic.
- Use whitespace as an intentional compositional tool, never as a placeholder for missing content. Remove large dead zones, especially between section headings and content, after checking desktop and mobile.
- Maintain a consistent content container and a deliberate spacing scale. Let only intentional moments break the grid.
- Build mobile deliberately. Do not rely on desktop layouts collapsing by accident. Reconsider crop, reading order, tap targets, density, and sticky elements at narrow widths.

### Hero design

The hero is the site’s opening argument, not a generic banner.

- Give every hero a distinctive composition rooted in the brand. It may use an immersive real image, a cinematic crop, a type-led statement, a product or environment detail, a structured split screen, or a considered media sequence.
- Establish the business, its value, and the primary action at a glance. A visitor should not have to scroll to understand what the business is or what to do next.
- Use at least one strong visual point of view: unexpected crop, layering, scale, contrast, motion, typography, or spatial framing. Do not settle for stock image plus centered white text by default.
- Keep overlay treatment readable without washing out the image. Test headline and button contrast against the actual media.
- Use one primary CTA and, when useful, one clearly secondary CTA. Avoid a cluster of equal-weight calls to action.
- Do not let a hero consume so much viewport height that it delays meaningful content, especially on mobile. The initial screen should feel cinematic and still invite exploration.
- If media changes automatically, provide usable controls, preserve readability, avoid quick cycling, and respect reduced-motion preferences.

## Color, type, and image system

### Color

- Define a purposeful palette with one or two primary colors and one or two supplemental colors, plus neutrals. Use the supplemental colors for hierarchy, accents, states, or special moments.
- Do not make the entire site one flat color. Contrast between backgrounds, type, imagery, and accents creates hierarchy and prevents visual fatigue.
- Assign colors roles: canvas, surface, primary text, muted text, action, accent, and border. Use tokens or CSS variables so the system remains coherent.
- Ensure accessible text and control contrast in every state. Brand color alone is not a substitute for legibility.
- Use gradients sparingly and only where the art direction calls for them. Avoid default purple-blue AI gradients and arbitrary multi-color glow effects.

### Typography and copy

- Choose a display face and supporting text face only when they create a useful contrast. Let typography carry part of the identity instead of treating it as a finishing touch.
- Set a readable body size, comfortable line height, sensible measure, and a small, consistent type scale. Do not use tiny all-caps text for essential content.
- Use hierarchy through scale, weight, case, spacing, color, and placement. Do not rely on giant headings everywhere.
- Write concise, specific, human copy. Replace vague marketing phrases with concrete proof, detail, and local character.
- Do not use em dashes in site copy. Rewrite with commas, periods, parentheses, or a new sentence.
- Do not use leading zeroes in visible numbers. Write `9:00 AM`, not `09:00 AM`; write `6th Avenue`, not `06th Avenue`. Preserve leading zeroes only when a technical, legal, or source value genuinely requires them.
- Use typographic punctuation and capitalization consistently. Check brand spelling, address, phone, hours, pricing, and legal text against source material.

### Images and media

- Prefer real, business-specific photography whenever possible: the space, team, products, work, neighborhood, events, or customers with appropriate permission. Authentic imagery is a major defense against generic design.
- Use supplied images truthfully. Do not distort, over-filter, or crop away the relevant subject.
- If real photography is unavailable, use intentional type, illustration, texture, diagram, or an editorial treatment. Do not pad the site with irrelevant stock photos or AI imagery that misrepresents the business.
- Match image crops to their role. Establishing shots, close details, portraits, and product images should have different ratios and visual rhythm.
- Use `next/image` for local and compatible remote raster imagery. Supply accurate alt text for meaningful images and empty alt text only for truly decorative media.
- Optimize source files, define responsive `sizes`, avoid layout shift, and mark only genuine above-the-fold content as priority.
- Treat logos as brand assets. Preserve their clear space, proportions, and legibility. Never use a low-resolution logo when a better asset is available.

## Navigation, footer, and conversion

### Sticky navigation

Every site must have a sticky or fixed navbar.

- Keep the navigation clear, compact, and branded. It must remain usable at every scroll position and on every page.
- Change its surface, contrast, border, or shadow once content scrolls beneath it when needed for readability. The transition should be subtle and performant.
- Include a recognizable logo or wordmark that returns home, logical page links, and one prioritized conversion action when appropriate.
- On mobile, provide an accessible menu with a visible close action, proper focus behavior, and a reliable way to reach every important page.
- Account for the navbar’s height with anchor offsets and page spacing so headings are never hidden behind it.

### Footer

Every site must include a complete footer, not an afterthought.

- Include the business identity, practical contact or location information where relevant, high-value page links, and social or policy links only when they are real.
- Include a visible, working `Made by Novus` link to `https://novusnyc.org` in every footer. The linked text must be exactly `Made by Novus`.
- Ensure external links use safe new-window handling when opened in a new tab: `target="_blank"` with `rel="noreferrer"`.
- Make the footer visually resolved and easy to scan. It should close the experience with the same care as the hero.

### Conversion and forms

- Make the primary action easy to find in the hero, navbar when appropriate, and relevant page endings. Examples include Book, Order, Get a Quote, View Menu, Call, or Visit.
- Use action-specific labels. Avoid repeated generic `Learn More` links where a clearer label is available.
- Keep forms short, understandable, and accessible. Label every field, show required state, validate with useful plain-language messages, and provide a clear success or follow-up expectation.
- Use `tel:`, `mailto:`, maps, booking, ordering, and social links only when they point to verified destinations.

## Motion and scroll experience

Motion is part of the browsing experience on every site, but it must feel quiet, useful, and earned.

- Build a scroll-driven experience. Reveal important content as it enters the viewport using restrained fades, short vertical movement, image masks, subtle scale, or sequencing that supports reading order.
- Vary the reveal treatment by content type without turning the page into a collection of unrelated effects. Use a small motion vocabulary.
- Motion should orient, emphasize, or create progression. It should not delay content, compete with copy, or exist only to prove that the page is animated.
- Favor CSS transitions and Intersection Observer for simple reveals. Use an animation library only when it meaningfully improves choreography, interaction, or state management.
- Keep durations calm and brief, typically around 250 to 700 milliseconds for interface and scroll reveals. Avoid long staged entrances, dramatic bounces, spinning elements, endless attention-seeking motion, scroll-jacking, and heavy parallax.
- Avoid animating expensive layout properties. Prefer `opacity` and `transform`; use blur, filters, and large video layers sparingly.
- Never ship a site with no animation, but never bloat a site with animation either. Subtle, repeated scroll reveals plus a few signature moments are the default balance.
- Respect `prefers-reduced-motion`. Reduced motion must leave all content immediately usable and avoid continuous, auto-advancing, or motion-dependent interactions.
- Test motion on mobile hardware and with a keyboard. Animation must not trap focus, cause layout shift, or harm performance.

## Accessibility, quality, and performance

- Use semantic landmarks: one `main`, meaningful `header`, `nav`, `footer`, heading order, lists, and buttons for actions.
- Never use a clickable `div` when a button or link is appropriate. Every interactive element needs a visible focus state and a generous touch target.
- Ensure keyboard navigation works through menus, dialogs, forms, carousels, and all CTA paths.
- Do not communicate essential meaning with color alone. Provide labels, text, icons with accessible names, or other redundant cues.
- Set a real page title and description for every route. Add Open Graph metadata when assets are available.
- Always add a favicon and app icons before delivery. Use the business logo or a recognizable brand mark, and verify the browser tab displays it.
- Keep page weight lean. Compress images, defer noncritical media, limit third-party scripts, and do not add a dependency for a small CSS or React task.
- Avoid hydration errors, console errors, broken routes, missing images, horizontal scrolling, and cumulative layout shift.
- Provide meaningful loading and empty states only where an interface actually has asynchronous content.

## Implementation conventions

- Use Next.js App Router conventions already present in the repository. Keep routes and shared components organized by responsibility.
- Build reusable primitives for repeated patterns such as section wrappers, buttons, navigation, footer, reveal behavior, and metadata. Do not abstract one-off art direction out of existence.
- Keep all business details centralized where practical: addresses, phone numbers, social URLs, hours, CTA destinations, menu or service data, and brand assets.
- Use TypeScript types for component props and structured data. Avoid `any` and duplicate magic strings.
- Use Tailwind consistently with the project configuration. Add design tokens for the brand instead of scattering near-identical arbitrary values.
- Make client components only when browser state, event handlers, or animation require them. Keep content-oriented components server-rendered by default.
- Keep code readable and responsive styles intentional. Do not hide bugs behind `overflow-hidden`, arbitrary z-index escalation, or breakpoint-specific patches without understanding the layout.

## Required delivery checklist

Before considering a site complete, verify all of the following:

- [ ] `AGENTS.md` and `CLAUDE.md` remain exactly identical.
- [ ] The page structure supports a meaningful multi-page experience, except where a true one-page site is clearly appropriate and approved.
- [ ] The hero is brand-specific, visually memorable, readable, and action-oriented.
- [ ] The palette includes one or two primary colors and one or two supplemental colors, used with intentional contrast.
- [ ] Real business imagery is used wherever available, optimized, and accurately described with alt text.
- [ ] The navbar is sticky or fixed, usable on desktop and mobile, and has correct scroll behavior.
- [ ] Each footer includes a working `Made by Novus` link to `https://novusnyc.org`.
- [ ] A favicon and appropriate app icons are present and visible.
- [ ] Scroll-based reveals or similarly restrained motion create progression, while `prefers-reduced-motion` is honored.
- [ ] There are no em dashes or inappropriate leading zeroes in visible copy.
- [ ] Spacing is intentional with no unexplained empty areas or accidental horizontal overflow.
- [ ] Desktop, tablet, and mobile layouts have been visually checked, including navigation, hero crops, CTAs, footer, and form behavior.
- [ ] Keyboard focus, contrast, headings, image alternatives, and interactive controls have been checked.
- [ ] Links, phone numbers, emails, maps, social profiles, booking or ordering destinations, titles, descriptions, and images have been verified.
- [ ] The production build and relevant lint or type checks pass without new errors.

When a requirement conflicts with a verified business or brand constraint, preserve the business need and document the exception in the implementation. Otherwise, this standard is the default for every website built from this template.
