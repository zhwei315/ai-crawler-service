// 阿里云函数计算工具函数

// 获取请求体
export async function getRawBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', (err: Error) => {
      reject(err);
    });
  });
}

// 阿里云函数计算环境检测
export function isAliyunFC(): boolean {
  return !!process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || 
         !!process.env.FC_FUNCTION_NAME ||
         !!process.env.FC_REGION;
}

// 获取临时凭证（用于访问其他阿里云服务）
export function getCredentials() {
  return {
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    securityToken: process.env.ALIBABA_SECURITY_TOKEN,
  };
}
