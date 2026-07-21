import { z } from "zod";

export const awardMetadataSchema = z.object({
  schemaVersion: z.literal("1.0"),
  awardId: z.string().min(1),
  event: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    organizerName: z.string().min(1),
    officialUrl: z.string().url().optional(),
  }),
  project: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    tagline: z.string().min(1),
    githubUrl: z.string().url().optional(),
    demoUrl: z.string().url().optional(),
  }),
  award: z.object({
    title: z.string().min(1),
    awardedAt: z.string().min(1),
    reason: z.string().optional(),
  }),
  recipients: z.array(
    z.object({
      displayName: z.string().min(1),
      walletAddress: z.string().min(1),
      allocation: z.string().regex(/^\d+$/),
    }),
  ),
  reward: z.object({
    tokenAddress: z.string().min(1),
    symbol: z.string().min(1),
    decimals: z.number().int().nonnegative(),
    totalAmount: z.string().regex(/^\d+$/),
  }),
});

export type AwardMetadata = z.infer<typeof awardMetadataSchema>;
