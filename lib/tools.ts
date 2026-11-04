import { tool } from "ai";
import { z } from "zod";
import { ApiRequestError, createReturn, getCategories, getOrder, getProductById, getProducts, getProductStock, preauthorizeRefund, notifyReturnInProcess } from "@/lib/api";

export const searchProducts = tool({
  description: `BROAD lookup: search the product catalog and return up to 10 matching products (summary only: name, slug, image, price, category, description). Use this when the user is browsing, describing a need ('something warm'), naming a type of item ('hoodies'), or wants recommendations or options to compare. Do NOT use it to get stock or full details for one specific product you already know; use getProductDetails for that. Optionally narrow results to a single category.`,
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        `Optional free-text search terms describing what the user is looking for, e.g. 'hoodie' or 'water bottle'.`,
      ),
    category: z
      .string()
      .optional()
      .describe(
        `Optional category slug to filter results. Only set this when the user clearly wants a specific category. Use the getAllCategories tool to get all valid categories.`,
      ),
  }),
  execute: async ({ query, category }) => {
    try {
      const products = await getProducts({
        search: query,
        category,
        limit: 10,
      });
      return {
        count: products.length,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          image: p.images[0],
          price: p.price,
          currency: p.currency,
          category: p.category,
          description: p.description,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, products: [], error: message };
    }
  },
});

export const getProductDetails = tool({
  description: `SINGLE-ITEM lookup: get full details plus live stock for ONE specific product, by its id or slug. Use this when the user asks about a particular product (e.g. 'is the Ship It hoodie in stock?', 'tell me more about the second one') and you already have its slug or id, typically from an earlier searchProducts result. Do NOT use it to browse or find products; if you don't have a slug or id yet, call searchProducts first and then call this with the chosen result.`,
  inputSchema: z.object({
    idOrSlug: z
      .string()
      .describe(
        `The product's id or slug, as returned by searchProducts. Never guess it.`,
      ),
  }),
  execute: async ({ idOrSlug }) => {
    try {
      const [p, stock] = await Promise.all([
        getProductById(idOrSlug),
        getProductStock(idOrSlug),
      ]);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        images: p.images,
        price: p.price,
        currency: p.currency,
        category: p.category,
        description: p.description,
        tags: p.tags,
        stock: stock.stock,
        inStock: stock.inStock,
        lowStock: stock.lowStock,
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { error: message };
    }
  },
});

export const getAllCategories = tool({
  description: `List every product category available in the Vercel swag store, along with the number of products in each. Use this when the user asks what categories exist, what kinds of products are sold, or wants to browse the store at a high level.`,
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const categories = await getCategories();
      return {
        count: categories.length,
        categories: categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          productCount: c.productCount,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, categories: [], error: message };
    }
  },
});

export const returnOrder = tool({
  description: `File a return for one of the user's past orders. The user must provide an order ID and a reason. Example order IDs: 11111, 22222, 33333.`,
  inputSchema: z.object({
    orderId: z
      .string()
      .describe("The order ID the user wants to return."),
    reason: z
      .string()
      .min(10)
      .max(500)
      .describe("Why the user is returning the order."),
  }),
  execute: async ({ orderId, reason }) => {
    try {
      const order = await getOrder(orderId);
      await notifyReturnInProcess(orderId);
      await preauthorizeRefund(orderId);
      const filed = await createReturn({
        orderId: order.id,
        items: order.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        reason,
      });
      return { returnId: filed.id, status: filed.status };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { error: message };
    }
  },
});