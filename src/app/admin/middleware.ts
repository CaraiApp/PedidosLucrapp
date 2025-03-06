// src/app/admin/middleware.ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAdminAuth() {
  const router = useRouter();

  useEffect(() => {
    const checkAdminAccess = () => {
      const hasAccess = sessionStorage.getItem("adminAccess") === "granted";
      if (!hasAccess) {
        router.push("/admin");
      }
    };

    checkAdminAccess();
  }, [router]);
}

export default useAdminAuth;
