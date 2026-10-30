import { asc, eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { brands, categories, products } from "@/src/modules/catalog/schema";
import { stockLocations } from "@/src/modules/inventory/schema";
import { suppliers } from "./schema";
export async function listProcurementData() {
 const [productRows,categoryRows,brandRows,supplierRows,locations]=await Promise.all([
 db.select({id:products.id,slug:products.slug,sku:products.sku,barcode:products.barcode,nameEn:products.nameEn,nameNe:products.nameNe,model:products.model,unit:products.unit,costPaisa:products.costPaisa,taxCategory:products.taxCategory,categoryId:products.categoryId,brandId:products.brandId,categoryName:categories.nameEn,brandName:brands.name}).from(products).leftJoin(categories,eq(products.categoryId,categories.id)).leftJoin(brands,eq(products.brandId,brands.id)).orderBy(asc(products.nameEn)).limit(2000),
 db.select({id:categories.id,name:categories.nameEn}).from(categories).orderBy(asc(categories.sortOrder),asc(categories.nameEn)),
 db.select({id:brands.id,name:brands.name}).from(brands).orderBy(asc(brands.name)),
 db.select({id:suppliers.id,name:suppliers.name,phone:suppliers.phone,panNo:suppliers.panNo}).from(suppliers).orderBy(asc(suppliers.name)),
 db.select({id:stockLocations.id,code:stockLocations.code,name:stockLocations.name,isDefault:stockLocations.isDefault}).from(stockLocations).orderBy(asc(stockLocations.name))
 ]);
 return {products:productRows.map(p=>({...p,costPaisa:p.costPaisa?.toString()??null})),categories:categoryRows,brands:brandRows,suppliers:supplierRows,locations};
}