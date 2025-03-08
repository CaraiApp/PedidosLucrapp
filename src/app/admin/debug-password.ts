"use client";

import CryptoJS from "crypto-js";

export function debugPassword(password: string): string {
  return CryptoJS.MD5(password).toString();
}