import { NextRequest, NextResponse } from 'next/server';
import {
    getCreditUsageRecordByNo,
    markTaskAsSuccess,
    markTaskAsFailed
} from '@/services/creditUsageRecord';

// export const runtime = "edge";

export async function GET(request: NextRequest) {

    try {
        // 获取客户端IP
        const forwardedFor = request.headers.get("x-forwarded-for");
        const clientIp = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
        console.log(`request ip: ${clientIp}`);

        // 从URL参数获取taskId和recordNo
        const url = new URL(request.url);
        const taskId = url.searchParams.get('taskId');
        const recordNo = url.searchParams.get('recordNo');

        console.log(`taskId: ${taskId}, recordNo: ${recordNo}`);

        if (!taskId) {
            return NextResponse.json(
                { error: 'Missing taskId parameter' },
                { status: 400 }
            );
        }

        // 获取Kie.ai API密钥
        const apiKey = process.env.KIE_API_KEY;
        if (!apiKey) {
            console.error('Missing KIE_API_KEY in environment variables');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // 调用Kie.ai API查询任务状态
        const apiResponse = await fetch(`https://api.kie.ai/v1/recordInfo?taskId=${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'redirect': "follow"
            }
        });

        console.log('Kie.ai Nano Banana Edit API response status:', apiResponse.status);

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            console.error('Kie.ai Nano Banana Edit API error:', errorData);
            return NextResponse.json(
                { error: 'Failed to fetch task status', details: errorData },
                { status: apiResponse.status }
            );
        }

        // 解析响应数据
        const taskResp = await apiResponse.json();
        console.log('Nano Banana Edit task response:', JSON.stringify(taskResp));

        // 根据状态返回不同的响应
        if (taskResp.status === 'succeeded') {
            // 如果有recordNo，更新积分使用记录为成功状态
            if (recordNo) {
                try {
                    await markTaskAsSuccess(recordNo, {
                        imageUrl: taskResp.result?.urls?.[0] || taskResp.result,
                        completedAt: new Date()
                    });
                } catch (recordError) {
                    console.error('Failed to update credit usage record:', recordError);
                }
            }

            // 如果生成成功，返回图像URL
            return NextResponse.json({
                success: true,
                status: 'SUCCESS',
                editedImage: taskResp.result?.urls?.[0] || taskResp.result,
                message: 'Image editing completed successfully'
            });
        } else if (taskResp.status === 'running' || taskResp.status === 'pending') {
            // 如果还在生成中，返回状态
            return NextResponse.json({
                success: true,
                status: 'GENERATING',
                message: 'Image editing in progress, please check later'
            });
        } else if (taskResp.status === 'failed') {
            // 如果有recordNo，更新积分使用记录为失败状态
            if (recordNo) {
                try {
                    await markTaskAsFailed(recordNo, taskResp.error || 'Image editing failed');
                } catch (recordError) {
                    console.error('Failed to update credit usage record:', recordError);
                }
            }

            // 如果生成失败，返回错误信息
            return NextResponse.json({
                success: false,
                status: 'FAILED',
                error: taskResp.error || 'Image editing failed',
                message: 'Failed to edit image'
            });
        } else {
            // 处理其他状态
            return NextResponse.json({
                success: true,
                status: taskResp.status?.toUpperCase() || 'UNKNOWN',
                message: `Task status: ${taskResp.status || 'unknown'}`
            });
        }

    } catch (error: unknown) {
        console.error('API error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to check image editing task status'
        }, { status: 500 });
    }
} 