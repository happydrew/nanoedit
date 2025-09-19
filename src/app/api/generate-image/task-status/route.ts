import { NextRequest, NextResponse } from 'next/server';
import { getTaskById } from '@/models/task';
import {
    markTaskAsSuccess,
    markTaskAsFailed
} from '@/services/taskService';

// export const runtime = "edge";

export async function GET(request: NextRequest) {

    try {
        // 获取客户端IP
        const forwardedFor = request.headers.get("x-forwarded-for");
        const clientIp = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
        console.log(`request ip: ${clientIp}`);

        // 从URL参数获取taskId和我们的内部taskId
        const url = new URL(request.url);
        const externalTaskId = url.searchParams.get('taskId');
        const internalTaskId = url.searchParams.get('recordNo'); // 现在这个是我们的内部任务ID

        console.log(`externalTaskId: ${externalTaskId}, internalTaskId: ${internalTaskId}`);

        if (!externalTaskId) {
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

        // 调用Kie.ai API查询任务状态 - 使用官方API接口
        const apiResponse = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${externalTaskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });

        console.log('Kie.ai API response status:', apiResponse.status);

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            console.error('Kie.ai API error:', errorData);
            return NextResponse.json(
                { error: 'Failed to fetch task status', details: errorData },
                { status: apiResponse.status }
            );
        }

        // 解析响应数据
        const taskResp = await apiResponse.json();
        console.log('Kie.ai task response:', JSON.stringify(taskResp));

        // 检查响应格式和code
        if (taskResp.code !== 200) {
            console.error('Kie.ai API returned error code:', taskResp.code, taskResp.message);
            return NextResponse.json(
                { error: 'API returned error', details: taskResp.message },
                { status: 500 }
            );
        }

        const taskData = taskResp.data;
        if (!taskData) {
            console.error('Missing task data in response');
            return NextResponse.json(
                { error: 'Invalid response format' },
                { status: 500 }
            );
        }

        // 根据官方API文档的状态字段进行判断
        const taskState = taskData.state;
        console.log(`Task state: ${taskState}, taskId: ${taskData.taskId}`);

        if (taskState === 'success') {
            // 如果有内部任务ID，更新任务状态为成功
            if (internalTaskId) {
                try {
                    await markTaskAsSuccess(internalTaskId);
                    console.log(`Task ${internalTaskId} marked as success`);
                } catch (recordError) {
                    console.error('Failed to update task status:', recordError);
                }
            }

            // 解析resultJson获取生成的图片URL
            let imageUrl = null;
            try {
                if (taskData.resultJson) {
                    console.log('Parsing resultJson:', taskData.resultJson);
                    const resultData = JSON.parse(taskData.resultJson);
                    console.log('Parsed result data:', resultData);
                    imageUrl = resultData.resultUrls?.[0] || null;
                    console.log('Extracted image URL:', imageUrl);
                }
            } catch (parseError) {
                console.error('Failed to parse resultJson:', parseError);
            }

            // 如果生成成功，返回图像URL
            return NextResponse.json({
                success: true,
                status: 'SUCCESS',
                editedImage: imageUrl,
                message: 'Image editing completed successfully'
            });
        } else if (taskState === 'generating' || taskState === 'queuing' || taskState === 'waiting') {
            // 如果还在生成中，返回状态
            return NextResponse.json({
                success: true,
                status: 'GENERATING',
                message: 'Image editing in progress, please check later'
            });
        } else if (taskState === 'fail') {
            // 如果有内部任务ID，更新任务状态为失败
            if (internalTaskId) {
                try {
                    const errorMessage = taskData.failMsg || 'Image editing failed';
                    await markTaskAsFailed(internalTaskId, errorMessage);
                    console.log(`Task ${internalTaskId} marked as failed: ${errorMessage}`);
                } catch (recordError) {
                    console.error('Failed to update task status:', recordError);
                }
            }

            // 如果生成失败，返回错误信息
            return NextResponse.json({
                success: false,
                status: 'FAILED',
                error: taskData.failMsg || 'Image editing failed',
                failCode: taskData.failCode || '',
                message: 'Failed to edit image'
            });
        } else {
            // 处理其他状态
            console.log(`Unknown task state: ${taskState}`);
            return NextResponse.json({
                success: true,
                status: taskState?.toUpperCase() || 'UNKNOWN',
                message: `Task status: ${taskState || 'unknown'}`
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