import { Injectable } from "@nestjs/common";
import { BoardCoreService } from "./core/board-core.service";
import { GLOBAL_BOARD_SCOPE } from "./core/board-scope.config";
import type { CreateCategoryDto } from "./dto/create-category.dto";
import type { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class BoardCategoriesService {
  constructor(private readonly core: BoardCoreService) {}

  findAll() {
    return this.core.findAllCategories(GLOBAL_BOARD_SCOPE);
  }

  create(userId: string, dto: CreateCategoryDto) {
    return this.core.createCategory(GLOBAL_BOARD_SCOPE, userId, dto);
  }

  update(id: string, dto: UpdateCategoryDto) {
    return this.core.updateCategory(GLOBAL_BOARD_SCOPE, id, dto);
  }

  reorder(items: { id: string; sortOrder: number }[]) {
    return this.core.reorderCategories(GLOBAL_BOARD_SCOPE, items);
  }

  softDelete(id: string) {
    return this.core.softDeleteCategory(GLOBAL_BOARD_SCOPE, id);
  }
}
