import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { FeatureEnabledGuard } from "@/common/guards";
import { ChatService } from "./chat.service";
import { CreateRoomDto } from "./dto/create-room.dto";
import { UpdateRoomDto } from "./dto/update-room.dto";
import { AddMemberDto } from "./dto/add-member.dto";
import { MessageQueryDto } from "./dto/message-query.dto";

@Controller("chat/rooms")
@ApiTags("Chat")
@ApiBearerAuth()
@FeatureEnabled("chat")
@UseGuards(FeatureEnabledGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @ApiOperation({ summary: "ルーム一覧（自分の所属ルーム）" })
  findRooms(@CurrentUser("id") userId: string) {
    return this.chatService.findRooms(userId);
  }

  @Post()
  @ApiOperation({ summary: "ルーム作成" })
  createRoom(@CurrentUser("id") userId: string, @Body() dto: CreateRoomDto) {
    return this.chatService.createRoom(userId, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "ルーム詳細" })
  findRoom(@Param("id", ParseUUIDPipe) id: string, @CurrentUser("id") userId: string) {
    return this.chatService.findRoomById(id, userId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "ルーム更新（グループのみ）" })
  updateRoom(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.chatService.updateRoom(id, userId, dto);
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "メッセージ履歴" })
  findMessages(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
    @Query() query: MessageQueryDto,
  ) {
    return this.chatService.findMessages(id, userId, query);
  }

  @Post(":id/members")
  @ApiOperation({ summary: "メンバー追加（グループのみ）" })
  addMember(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.chatService.addMember(id, userId, dto.userId);
  }

  @Delete(":id/members/:userId")
  @ApiOperation({ summary: "メンバー削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
    @Param("userId", ParseUUIDPipe) targetUserId: string,
  ) {
    return this.chatService.removeMember(id, userId, targetUserId);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "既読更新" })
  @HttpCode(HttpStatus.NO_CONTENT)
  markAsRead(@Param("id", ParseUUIDPipe) id: string, @CurrentUser("id") userId: string) {
    return this.chatService.markAsRead(id, userId);
  }

  @Patch(":id/mute")
  @ApiOperation({ summary: "ミュート切替" })
  toggleMute(@Param("id", ParseUUIDPipe) id: string, @CurrentUser("id") userId: string) {
    return this.chatService.toggleMute(id, userId);
  }
}
