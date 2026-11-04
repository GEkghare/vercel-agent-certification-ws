"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { ProductDetailsToolInvocation } from "@/lib/agent";

interface AgentProductCardProps {
  invocation: ProductDetailsToolInvocation;
}

const errorClass =
  "rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive";

export function AgentProductCard({ invocation }: AgentProductCardProps) {
  switch (invocation.state) {
    case "input-streaming":
    case "input-available":
      return (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Loading product details…
        </div>
      );

    case "output-error":
      return <div className={errorClass}>{invocation.errorText}</div>;

    case "output-available": {
      const product = invocation.output;
      if (!product) return null;

      if ("error" in product) {
        return <div className={errorClass}>{product.error}</div>;
      }

      const status = !product.inStock
        ? { label: "Out of stock", className: "text-destructive" }
        : product.lowStock
          ? { label: "Low stock", className: "text-amber-600" }
          : { label: "In stock", className: "text-emerald-600" };

      return (
        <Link
          href={`/products/${product.slug}`}
          className="flex gap-3 overflow-hidden rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary/50"
        >
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-secondary">
            {product.images[0] && (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                sizes="96px"
                className="object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold leading-tight">
              {product.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {formatPrice(product.price, product.currency)} · {product.category}
            </p>
            <p className={`text-xs font-medium ${status.className}`}>
              {status.label}
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {product.description}
            </p>
          </div>
        </Link>
      );
    }

    default:
      return null;
  }
}
