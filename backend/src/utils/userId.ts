/**
 * FLOW U-USER-ID: Генерация уникального 8-значного ID пользователя
 * Только цифры 0-9 (10^8 = 100 млн комбинаций)
 * Присваивается при регистрации, остаётся навсегда
 */

const MIN = 10000000; // 8 digits, no leading zero for first digit
const MAX = 99999999;

export function generateUserId(): string {
  const range = MAX - MIN + 1;
  const value = MIN + Math.floor(Math.random() * range);
  return String(value);
}
