"""
ViewSight API 测试脚本
用于直接测试与ViewSight服务器的通信
"""
import requests
import json
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_viewsight_api():
    """测试ViewSight的API连接"""
    server_url = "http://sy1.efrp.eu.org:40399"
    endpoint = f"{server_url}/analyze_video_link"
    
    # 测试BV号
    bvid = "BV1xx411c79H"  # 一个示例BV号
    
    # 基本配置
    config = {
        "cookie": "",  # 不设置cookie，测试最简单的情况
        "aiServerUrl": server_url,
        "imageUrl": "",
        "imageToken": "",
        "imageModel": "",
        "backendUrl": "",
        "token": "",
        "model": ""
    }
    
    payload = {
        "videoLink": bvid,
        "config": config
    }
    
    logger.info(f"发送测试请求到 {endpoint}")
    logger.info(f"请求数据: {json.dumps(payload, ensure_ascii=False)}")
    
    try:
        # 发送请求
        response = requests.post(
            endpoint, 
            json=payload, 
            timeout=120,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'BiliBrother-Test-Client/1.0'
            }
        )
        
        logger.info(f"状态码: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"请求失败: {response.text}")
        else:
            try:
                result = response.json()
                logger.info(f"请求成功! 响应数据: {json.dumps(result, ensure_ascii=False)}")
            except Exception as e:
                logger.error(f"解析JSON响应失败: {str(e)}")
                logger.error(f"原始响应: {response.text[:500]}")
        
    except requests.exceptions.Timeout:
        logger.error("请求超时")
    except requests.exceptions.ConnectionError:
        logger.error(f"无法连接到服务器 {server_url}")
    except Exception as e:
        logger.error(f"请求过程中发生错误: {str(e)}")
        
if __name__ == "__main__":
    test_viewsight_api()
