import { defineSeed } from "void/seed";

import type { messages } from "./schema";

const SAMPLE_MESSAGES = ["Hello from Void"];

export default defineSeed<{ messages: typeof messages }>(async ({ db, schema }) => {
  await db.insert(schema.messages).values(
    SAMPLE_MESSAGES.map((text) => ({
      text,
    })),
  );
});
