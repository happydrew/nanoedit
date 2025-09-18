import { getUserCredits, decreaseCredits, CreditsTransType } from '@/services/credit';

/**
 * 检查用户是否有足够的积分
 * @param userId 用户UUID
 * @param requiredCredits 需要的积分数量
 * @returns 是否有足够积分
 */
export async function hasEnoughCredits(userId: string, requiredCredits: number): Promise<boolean> {
  try {
    const userCredits = await getUserCredits(userId);
    return userCredits.left_credits >= requiredCredits;
  } catch (error) {
    console.error('Error checking user credits:', error);
    return false;
  }
}

/**
 * 扣除用户积分
 * @param userId 用户UUID
 * @param credits 要扣除的积分数量
 * @param description 扣除原因描述
 * @returns 是否扣除成功
 */
export async function deductCredits(userId: string, credits: number, description: string): Promise<boolean> {
  try {
    await decreaseCredits({
      user_uuid: userId,
      trans_type: CreditsTransType.AIImageEdit, // 使用AI图片编辑专用类型
      credits: credits
    });
    console.log(`Successfully deducted ${credits} credits from user ${userId} for: ${description}`);
    return true;
  } catch (error) {
    console.error(`Failed to deduct ${credits} credits from user ${userId}:`, error);
    return false;
  }
}