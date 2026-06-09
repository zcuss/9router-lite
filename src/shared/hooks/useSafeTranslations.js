"use client";

import { useTranslations } from "next-intl";

export function useSafeTranslations(namespace) {
  try {
    return useTranslations(namespace);
  } catch (error) {
    const fallbackT = (key) => key;
    fallbackT.rich = (key) => key;
    fallbackT.markup = (key) => key;
    fallbackT.raw = (key) => key;
    return fallbackT;
  }
}