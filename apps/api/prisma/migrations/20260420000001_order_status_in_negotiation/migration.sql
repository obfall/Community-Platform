-- AlterEnum: 注文ステータスに "取引中" を追加
ALTER TYPE "OrderStatus" ADD VALUE 'in_negotiation';
