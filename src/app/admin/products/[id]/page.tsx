"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminProductEditPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the unified product form page with the id
    router.replace(`/admin/products/new?id=${params.id}`);
  }, [params.id, router]);

  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
