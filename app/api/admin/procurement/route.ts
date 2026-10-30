import { and, asc, eq, ilike, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { adminApi, fail, UUID } from "@/lib/server/admin-api";
import { logAudit } from "@/lib/server/admin-auth";
import { jsonSafe } from "@/src/lib/json";
import { db } from "@/src/db/client";
import { brands,categories,products } from "@/src/modules/catalog/schema";
import { stockLocations } from "@/src/modules/inventory/schema";
import { suppliers } from "@/src/modules/purchasing/schema";
import { createPurchaseBill,type NewPurchaseBill } from "@/src/modules/purchasing/service";
import { toPaisa } from "@/src/lib/money";
import type { TaxCategory } from "@/src/modules/sales/pricing";
export const runtime="nodejs"; export const dynamic="force-dynamic";
const MONEY=/^\d+(?:\.\d{1,2})?$/, QTY=/^\d+(?:\.\d{1,3})?$/, TAX=new Set(["STANDARD","EXEMPT","ZERO"]);
export async function GET(request:Request) {
 const guard=await adminApi(request,"procurement"); if("error" in guard)return guard.error;
 try { const url=new URL(request.url),q=(url.searchParams.get("q")??"").trim().slice(0,80),where=[];
 if(q){const term="%"+q.replace(/[\\%_]/g,"\\$&")+"%";where.push(or(ilike(products.nameEn,term),ilike(products.nameNe,term),ilike(products.sku,term),ilike(products.barcode,term),ilike(products.model,term))!);}
 const c=url.searchParams.get("categoryId"),b=url.searchParams.get("brandId");if(c&&UUID.test(c))where.push(eq(products.categoryId,c));if(b&&UUID.test(b))where.push(eq(products.brandId,b));
 const [ps,cs,bs,ss,ls]=await Promise.all([
 db.select({id:products.id,slug:products.slug,sku:products.sku,barcode:products.barcode,nameEn:products.nameEn,nameNe:products.nameNe,model:products.model,unit:products.unit,costPaisa:products.costPaisa,taxCategory:products.taxCategory,categoryId:products.categoryId,brandId:products.brandId,categoryName:categories.nameEn,brandName:brands.name}).from(products).leftJoin(categories,eq(products.categoryId,categories.id)).leftJoin(brands,eq(products.brandId,brands.id)).where(where.length?and(...where):undefined).orderBy(asc(products.nameEn)).limit(200),
 db.select({id:categories.id,name:categories.nameEn}).from(categories).orderBy(asc(categories.nameEn)),db.select({id:brands.id,name:brands.name}).from(brands).orderBy(asc(brands.name)),db.select({id:suppliers.id,name:suppliers.name,phone:suppliers.phone,panNo:suppliers.panNo}).from(suppliers).orderBy(asc(suppliers.name)),db.select({id:stockLocations.id,code:stockLocations.code,name:stockLocations.name,isDefault:stockLocations.isDefault}).from(stockLocations).orderBy(asc(stockLocations.name))]);
 return jsonSafe({products:ps.map(p=>({...p,costPaisa:p.costPaisa?.toString()??null})),categories:cs,brands:bs,suppliers:ss,locations:ls});
 }catch{return fail("Could not load procurement data.",503);}
}
export async function POST(request:Request) {
 const guard=await adminApi(request,"procurement");if("error" in guard)return guard.error;
 if(!["SUPER_ADMIN","BUSINESS_OWNER","MANAGER","PROCUREMENT_STAFF","INVENTORY_MANAGER"].includes(guard.session.role))return fail("You do not have permission to post supplier purchases.",403);
 let body:Record<string,unknown>;try{const v:unknown=await request.json();if(!v||typeof v!=="object"||Array.isArray(v))return fail("Invalid request.");body=v as Record<string,unknown>;}catch{return fail("Invalid request.");}
 if(typeof body.supplierInvoiceNo!=="string"||!body.supplierInvoiceNo.trim()||body.supplierInvoiceNo.trim().length>100||typeof body.invoiceDate!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(body.invoiceDate)||typeof body.locationId!=="string"||!UUID.test(body.locationId)||!Array.isArray(body.lines)||!body.lines.length||body.lines.length>100)return fail("Enter invoice number, date, receiving location and at least one product.");
 const [year,month,day]=body.invoiceDate.split("-").map(Number),d=new Date(Date.UTC(year,month-1,day));if(d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day)return fail("Invoice date is invalid.");
 if(!body.supplier||typeof body.supplier!=="object"||Array.isArray(body.supplier))return fail("Select or enter a supplier.");const s=body.supplier as Record<string,unknown>;
 if(s.id!==undefined&&(typeof s.id!=="string"||!UUID.test(s.id)))return fail("Invalid supplier.");if(!s.id&&(typeof s.name!=="string"||!s.name.trim()||s.name.trim().length>160))return fail("Supplier name is required.");
 const items:NewPurchaseBill["items"]=[];for(const raw of body.lines){if(!raw||typeof raw!=="object"||Array.isArray(raw))return fail("Invalid product line.");const l=raw as Record<string,unknown>;
 if(typeof l.slug!=="string"||l.slug.length>180||typeof l.qty!=="string"||!QTY.test(l.qty)||typeof l.unitPrice!=="string"||!MONEY.test(l.unitPrice)||(l.taxCategory!==undefined&&(typeof l.taxCategory!=="string"||!TAX.has(l.taxCategory))))return fail("Check product quantity, price and tax category.");
 const qty=Number(l.qty);if(!Number.isFinite(qty)||qty<=0||qty>1000000)return fail("Quantity must be positive and within the allowed limit.");try{items.push({slug:l.slug,qty,unitPaisa:toPaisa(l.unitPrice),taxCategory:l.taxCategory as TaxCategory|undefined});}catch{return fail("Invalid purchase price.");}}
 try{const result=await createPurchaseBill({supplier:{id:s.id as string|undefined,name:typeof s.name==="string"?s.name.trim():undefined,phone:typeof s.phone==="string"?s.phone.trim().slice(0,40):undefined,address:typeof s.address==="string"?s.address.trim().slice(0,300):undefined,panNo:typeof s.panNo==="string"?s.panNo.trim().slice(0,40):undefined},supplierInvoiceNo:body.supplierInvoiceNo.trim(),invoiceDate:{year,month,day},items,locationId:body.locationId,createdBy:guard.session.email});
 await logAudit(guard.session,"procurement.purchase.post","purchase_bill",result.id,{billNo:result.billNo,locationId:body.locationId,totalPaisa:result.totalPaisa.toString()},request);
 return NextResponse.json({ok:true,...result,totalPaisa:result.totalPaisa.toString()},{status:201});
 }catch(error){const m=error instanceof Error?error.message:"";if(m.includes("already entered")||m.startsWith("Unknown product")||m.includes("required")||m.includes("Invalid")||m.includes("not found"))return fail(m,409);console.error("purchase bill posting failed",error);return fail("Purchase could not be posted. No partial stock or accounting entries were saved. Check accounting setup and retry.",503);}
}