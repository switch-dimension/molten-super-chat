import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  mode: text('mode').notNull(), // 'chat' | 'compare'
  title: text('title').notNull().default('New chat'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  parts: jsonb('parts').notNull(), // UIMessage-style parts
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const chatRuns = pgTable('chat_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  modelKey: text('model_key').notNull(),
  messageId: uuid('message_id').references(() => chatMessages.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const compareBranches = pgTable('compare_branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  modelKey: text('model_key').notNull(),
  label: text('label').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const compareMessages = pgTable('compare_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => compareBranches.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  parts: jsonb('parts').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type ChatRun = typeof chatRuns.$inferSelect;
export type CompareBranch = typeof compareBranches.$inferSelect;
export type NewCompareBranch = typeof compareBranches.$inferInsert;
export type CompareMessage = typeof compareMessages.$inferSelect;
export type NewCompareMessage = typeof compareMessages.$inferInsert;
