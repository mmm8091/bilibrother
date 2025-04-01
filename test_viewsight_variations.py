"""
ViewSight API 测试脚本 - 尝试不同的参数组合
"""
import requests
import json
import logging
import time

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SERVER_URL = "http://sy1.efrp.eu.org:40399"

def test_request(endpoint, payload, description):
    """测试单个API请求"""
    logger.info(f"=== 测试 {description} ===")
    logger.info(f"请求URL: {endpoint}")
    logger.info(f"请求数据: {json.dumps(payload, ensure_ascii=False, indent=2)}")
    
    try:
        # 发送请求
        response = requests.post(
            endpoint, 
            json=payload, 
            timeout=60,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'BiliBrother-Test-Client/1.0'
            }
        )
        
        logger.info(f"状态码: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"请求失败: {response.text}")
            return False, None
        else:
            try:
                result = response.json()
                logger.info(f"请求成功! 响应数据: {json.dumps(result, ensure_ascii=False, indent=2)}")
                return True, result
            except Exception as e:
                logger.error(f"解析JSON响应失败: {str(e)}")
                logger.error(f"原始响应: {response.text[:500]}")
                return False, None
        
    except requests.exceptions.Timeout:
        logger.error("请求超时")
        return False, None
    except requests.exceptions.ConnectionError:
        logger.error(f"无法连接到服务器 {endpoint}")
        return False, None
    except Exception as e:
        logger.error(f"请求过程中发生错误: {str(e)}")
        return False, None

def check_available_endpoints():
    """检查哪些API端点可用"""
    base_endpoints = [
        "/up_title",
    ]
    
    logger.info("检查ViewSight服务器上可用的API端点...")
    
    for endpoint in base_endpoints:
        url = f"{SERVER_URL}{endpoint}"
        try:
            response = requests.get(url, timeout=5)
            logger.info(f"端点 {endpoint}: 状态码 {response.status_code}")
        except Exception as e:
            logger.error(f"端点 {endpoint} 请求出错: {str(e)}")

def test_api_variations():
    """测试不同的参数组合"""
    
    # 测试BV号
    bv_id = "BV1xx411c79H"
    
    # 测试不同的参数组合
    variations = [
        {
            "description": "最简单请求 - 只有videoLink，无config",
            "endpoint": f"{SERVER_URL}/analyze_video_link",
            "payload": {
                "videoLink": bv_id
            }
        },
        {
            "description": "完整B站链接",
            "endpoint": f"{SERVER_URL}/analyze_video_link",
            "payload": {
                "videoLink": f"https://www.bilibili.com/video/{bv_id}",
                "config": {}
            }
        },
        {
            "description": "空config对象",
            "endpoint": f"{SERVER_URL}/analyze_video_link",
            "payload": {
                "videoLink": bv_id,
                "config": {}
            }
        },
        {
            "description": "基本config参数",
            "endpoint": f"{SERVER_URL}/analyze_video_link",
            "payload": {
                "videoLink": bv_id,
                "config": {
                    "cookie": ""
                }
            }
        },
        {
            "description": "完整config参数，但值为空",
            "endpoint": f"{SERVER_URL}/analyze_video_link",
            "payload": {
                "videoLink": bv_id,
                "config": {
                    "cookie": "",
                    "aiServerUrl": SERVER_URL,
                    "imageUrl": "",
                    "imageToken": "",
                    "imageModel": "",
                    "backendUrl": "",
                    "token": "",
                    "model": ""
                }
            }
        }
    ]
    
    logger.info(f"开始测试ViewSight API，共 {len(variations)} 种变体...")
    
    for i, variant in enumerate(variations):
        logger.info(f"\n==================== 测试变体 {i+1}/{len(variations)} ====================")
        success, _ = test_request(
            variant["endpoint"], 
            variant["payload"], 
            variant["description"]
        )
        
        # 在请求之间暂停一下，避免过于频繁的请求
        time.sleep(1)
        
        if success:
            logger.info(f"变体 {i+1} 测试成功!")
            break
        else:
            logger.info(f"变体 {i+1} 测试失败，尝试下一个变体...\n")
    
if __name__ == "__main__":
    logger.info("开始ViewSight API测试...")
    
    # 首先检查哪些端点可用
    check_available_endpoints()
    
    # 然后测试不同的参数变体
    test_api_variations()
