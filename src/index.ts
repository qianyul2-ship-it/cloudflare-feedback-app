/**
 * User Feedback Dashboard - Cloudflare Workers
 * * Endpoints:
 * - POST /api/feedback: Submit feedback with AI auto-categorization and sentiment analysis
 * - GET /api/feedback: Retrieve all feedback entries
 */

interface Env {
    AI: any;
    DB: D1Database;
    ASSETS: Fetcher;
}

interface FeedbackRequestBody {
    content: string;
}

interface FeedbackRecord {
    id: number;
    content: string;
    sentiment: string;
    category: string;
    created_at: string;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        const pathname = url.pathname;
        const method = request.method;

        // 1. Handle CORS preflight (允许跨域请求)
        if (method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        // 2. POST /api/feedback - 接收反馈 + AI 分析
        if (pathname === '/api/feedback' && method === 'POST') {
            try {
                const body: FeedbackRequestBody = await request.json();

                if (!body.content || typeof body.content !== 'string') {
                    return new Response(
                        JSON.stringify({ error: 'Content is required and must be a string' }),
                        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
                    );
                }

                // 默认值 (如果 AI 失败，就用这个，防止数据库报错)
                let sentiment = 'Neutral';
                let category = 'Other'; 
                
                // === AI 分析开始 ===
                try {
                    const prompt = `Analyze this feedback: "${body.content}"

1. Determine sentiment (Positive, Negative, or Neutral).
2. Categorize it into EXACTLY one of these categories: 
   ['Bug', 'Feature Request', 'Pricing', 'UX/UI', 'Performance', 'Other']

Return ONLY a valid JSON object.`;

                    const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
                        messages: [
                            {
                                role: 'system',
                                content: 'You are a helpful assistant. Always respond with valid JSON only. Valid categories are: Bug, Feature Request, Pricing, UX/UI, Performance, Other.',
                            },
                            {
                                role: 'user',
                                content: prompt,
                            },
                        ],
                        // 强制约束输出格式，防止 AI 乱说话
                        response_format: {
                            type: 'json_schema',
                            json_schema: {
                                name: 'feedback_analysis',
                                schema: {
                                    type: 'object',
                                    properties: {
                                        sentiment: {
                                            type: 'string',
                                            enum: ['Positive', 'Negative', 'Neutral'],
                                        },
                                        category: {
                                            type: 'string',
                                            enum: ['Bug', 'Feature Request', 'Pricing', 'UX/UI', 'Performance', 'Other'],
                                        },
                                    },
                                    required: ['sentiment', 'category'],
                                },
                            },
                        },
                    });

                    // 解析 AI 的回复
                    let parsed: any = null;
                    
                    if (aiResponse && typeof aiResponse === 'object') {
                        if (typeof aiResponse.response === 'string') {
                            // 清理一下可能存在的 markdown 符号
                            const cleanJson = aiResponse.response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                            parsed = JSON.parse(cleanJson);
                        } else if (typeof aiResponse.response === 'object') {
                            parsed = aiResponse.response;
                        }
                    }

                    // 赋值并校验
                    if (parsed) {
                        if (parsed.sentiment) sentiment = parsed.sentiment;
                        
                        // 关键修复：确保分类名完全匹配数据库
                        const validCategories = ['Bug', 'Feature Request', 'Pricing', 'UX/UI', 'Performance', 'Other'];
                        
                        // 模糊匹配（忽略大小写）
                        const matched = validCategories.find(c => c.toLowerCase() === (parsed.category || '').toLowerCase());
                        
                        if (matched) {
                            category = matched;
                        } else if (parsed.category === 'Feature') {
                            // 自动纠错：把 "Feature" 变成 "Feature Request"
                            category = 'Feature Request';
                        } else {
                            category = 'Other';
                        }

                        console.log(`✅ AI Analysis: [${sentiment}] [${category}]`);
                    }

                } catch (aiError) {
                    console.error('❌ AI Analysis Failed (using defaults):', aiError);
                    // AI 挂了不影响主流程，继续往下存数据库
                }
                // === AI 分析结束 ===

                // 3. 存入 D1 数据库
                const result = await env.DB.prepare(
                    'INSERT INTO feedback (content, sentiment, category, created_at) VALUES (?, ?, ?, ?)'
                )
                    .bind(body.content, sentiment, category, new Date().toISOString())
                    .run();

                return new Response(
                    JSON.stringify({
                        id: result.meta.last_row_id,
                        content: body.content,
                        sentiment,
                        category,
                        created_at: new Date().toISOString(),
                    }),
                    {
                        status: 201,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                    }
                );
            } catch (error) {
                console.error('Error processing feedback:', error);
                return new Response(
                    JSON.stringify({ error: 'Internal server error' }),
                    {
                        status: 500,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                    }
                );
            }
        }

        // 4. GET /api/feedback - 获取所有数据
        if (pathname === '/api/feedback' && method === 'GET') {
            try {
                const result = await env.DB.prepare(
                    'SELECT id, content, sentiment, category, created_at FROM feedback ORDER BY created_at DESC'
                ).all<FeedbackRecord>();

                return new Response(
                    JSON.stringify(result.results || []),
                    {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                    }
                );
            } catch (error) {
                console.error('Error fetching feedback:', error);
                return new Response(
                    JSON.stringify({ error: 'Internal server error' }),
                    {
                        status: 500,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                    }
                );
            }
        }

        // 5. 静态资源兜底 (前端页面)
        if (env.ASSETS) {
            return env.ASSETS.fetch(request);
        }
        
        return new Response('Not Found', { status: 404 });
    },
} satisfies ExportedHandler<Env>;