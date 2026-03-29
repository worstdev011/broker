import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  nickname: z.string().min(2).max(30).optional(),
  phone: z.string().min(7).max(20).optional(),
  country: z.string().max(100).optional(),
  dateOfBirth: z.string().datetime().optional().refine((val) => {
    if (!val) return true;
    const dob = new Date(val);
    return dob < new Date();
  }, { message: "Date of birth cannot be in the future" }).refine((val) => {
    if (!val) return true;
    const dob = new Date(val);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  }, { message: "User must be at least 18 years old" }),
  currency: z.string().length(3).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const setPasswordSchema = z.object({
  newPassword: z.string().min(8).max(128),
});

export const deleteProfileSchema = z.object({
  password: z.string().optional(),
});

export const enable2FASchema = z.object({});

export const verify2FASchema = z.object({
  code: z.string().length(6),
});

export const disable2FASchema = z.object({
  password: z.string().min(1),
  code: z.string().length(6),
});

export const drawingBodySchema = z.object({
  instrument: z.string().min(1),
  type: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

export const updateDrawingSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});

export const chartSettingsSchema = z.object({
  instrument: z.string().optional(),
  timeframe: z.string().optional(),
  chartType: z.string().optional(),
  indicators: z.record(z.string(), z.unknown()).optional(),
});
