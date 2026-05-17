-- EventParticipantAnswer.question の外部キーを RESTRICT → CASCADE に変更し、
-- 質問削除時に紐づく回答も一緒に削除されるようにする。
-- これにより admin が「申込フォーム設定」から質問を削除する際の FK 制約エラーが解消される。

ALTER TABLE "event_participant_answers" DROP CONSTRAINT "event_participant_answers_question_id_fkey";

ALTER TABLE "event_participant_answers"
  ADD CONSTRAINT "event_participant_answers_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "event_application_questions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
