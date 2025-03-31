"""
后端API实现
提供RESTful API接口用于前端交互
"""
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from datetime import datetime

from .models import db, Video, Config
from .crawler import BiliCrawler

def create_app(db_path=None):
    """创建Flask应用实例
    
    Args:
        db_path: 数据库文件路径
        
    Returns:
        Flask应用实例
    """
    app = Flask(__name__, static_folder='../frontend/build')
    CORS(app)  # 允许跨域请求
    
    # 配置SQLite数据库
    if db_path is None:
        app_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(app_dir, '../data/bilibrother.db')
    
    # 确保数据目录存在
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # 初始化数据库
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        # 初始化默认配置
        if Config.query.filter_by(key='bilibili_cookie').first() is None:
            default_config = Config(
                key='bilibili_cookie', 
                value='', 
                description='B站登录Cookie，用于获取视频数据'
            )
            db.session.add(default_config)
            db.session.commit()
    
    # 创建爬虫实例
    crawler = BiliCrawler()
    
    # 加载Cookie
    with app.app_context():
        cookie_config = Config.query.filter_by(key='bilibili_cookie').first()
        if cookie_config and cookie_config.value:
            crawler.set_cookie(cookie_config.value)
    
    # API路由
    
    @app.route('/api/videos', methods=['GET'])
    def get_videos():
        """获取所有已保存的视频数据"""
        videos = Video.query.all()
        return jsonify([video.to_dict() for video in videos])
    
    @app.route('/api/videos', methods=['POST'])
    def add_video():
        """添加新视频"""
        data = request.json
        bvid = data.get('bvid')
        
        if not bvid:
            return jsonify({'error': '缺少视频BV号'}), 400
        
        # 检查是否已存在
        existing_video = Video.query.filter_by(bvid=bvid).first()
        if existing_video:
            return jsonify({'error': f'视频 {bvid} 已存在'}), 409
            
        # 抓取视频数据
        video_data = crawler.process_video(bvid)
        if not video_data:
            return jsonify({'error': f'获取视频 {bvid} 信息失败'}), 500
            
        # 创建新记录
        new_video = Video(
            bvid=video_data['bvid'],
            title=video_data['title'],
            link=video_data['link'],
            view_count=video_data['view_count'],
            danmaku_count=video_data['danmaku_count'],
            coin_count=video_data['coin_count'],
            like_count=video_data['like_count'],
            share_count=video_data['share_count'],
            favorite_count=video_data['favorite_count'],
            tname=video_data['tname'],
            cover_url=video_data['cover_url'],
            duration=video_data['duration'],
            follower_count=video_data['follower_count'],
            historical_likes=video_data['historical_likes'],
            archive_count=video_data['archive_count'],
            mid=video_data['mid'],
            author_name=video_data['author_name'],
            last_updated=datetime.now()
        )
        
        db.session.add(new_video)
        db.session.commit()
        
        return jsonify(new_video.to_dict()), 201
    
    @app.route('/api/videos/<bvid>', methods=['DELETE'])
    def delete_video(bvid):
        """删除指定视频"""
        video = Video.query.filter_by(bvid=bvid).first()
        if not video:
            return jsonify({'error': f'视频 {bvid} 不存在'}), 404
            
        db.session.delete(video)
        db.session.commit()
        
        return jsonify({'message': f'视频 {bvid} 已删除'}), 200
    
    @app.route('/api/videos/refresh', methods=['POST'])
    def refresh_videos():
        """刷新所有视频数据"""
        data = request.json or {}
        videos_to_refresh = data.get('bvids', [])
        
        if not videos_to_refresh:
            # 如果未指定，刷新所有视频
            videos = Video.query.all()
            videos_to_refresh = [video.bvid for video in videos]
        
        if not videos_to_refresh:
            return jsonify({'message': '没有需要刷新的视频'}), 200
            
        # 批量抓取最新数据
        updated_videos = []
        video_data_list = crawler.batch_process_videos(videos_to_refresh)
        
        for video_data in video_data_list:
            bvid = video_data['bvid']
            video = Video.query.filter_by(bvid=bvid).first()
            
            if video:
                # 更新现有记录
                video.title = video_data['title']
                video.view_count = video_data['view_count']
                video.danmaku_count = video_data['danmaku_count']
                video.coin_count = video_data['coin_count']
                video.like_count = video_data['like_count']
                video.share_count = video_data['share_count']
                video.favorite_count = video_data['favorite_count']
                video.follower_count = video_data['follower_count']
                video.historical_likes = video_data['historical_likes']
                video.archive_count = video_data['archive_count']
                video.author_name = video_data['author_name']
                video.last_updated = datetime.now()
                updated_videos.append(video.to_dict())
            else:
                # 创建新记录
                new_video = Video(
                    bvid=video_data['bvid'],
                    title=video_data['title'],
                    link=video_data['link'],
                    view_count=video_data['view_count'],
                    danmaku_count=video_data['danmaku_count'],
                    coin_count=video_data['coin_count'],
                    like_count=video_data['like_count'],
                    share_count=video_data['share_count'],
                    favorite_count=video_data['favorite_count'],
                    tname=video_data['tname'],
                    cover_url=video_data['cover_url'],
                    duration=video_data['duration'],
                    follower_count=video_data['follower_count'],
                    historical_likes=video_data['historical_likes'],
                    archive_count=video_data['archive_count'],
                    mid=video_data['mid'],
                    last_updated=datetime.now()
                )
                db.session.add(new_video)
                updated_videos.append(new_video.to_dict())
        
        db.session.commit()
        
        return jsonify({
            'message': f'成功刷新 {len(updated_videos)}/{len(videos_to_refresh)} 个视频',
            'videos': updated_videos
        })
    
    @app.route('/api/config', methods=['GET'])
    def get_config():
        """获取配置信息"""
        configs = Config.query.all()
        return jsonify([config.to_dict() for config in configs])
    
    @app.route('/api/config/<key>', methods=['PUT'])
    def update_config(key):
        """更新配置信息"""
        data = request.json
        if 'value' not in data:
            return jsonify({'error': '缺少配置值'}), 400
            
        config = Config.query.filter_by(key=key).first()
        if not config:
            return jsonify({'error': f'配置项 {key} 不存在'}), 404
            
        config.value = data['value']
        config.updated_at = datetime.now()
        db.session.commit()
        
        # 如果更新的是Cookie，则重新设置爬虫的Cookie
        if key == 'bilibili_cookie':
            crawler.set_cookie(data['value'])
            
        return jsonify(config.to_dict())
    
    @app.route('/api/export', methods=['GET'])
    def export_data():
        """导出所有数据为JSON或CSV"""
        videos = Video.query.all()
        data = [video.to_dict() for video in videos]
        
        # 检查是否要求CSV格式
        format_type = request.args.get('format', 'json')
        
        if format_type.lower() == 'csv':
            import csv
            from io import StringIO
            
            # 创建CSV内存文件
            si = StringIO()
            csv_writer = csv.writer(si)
            
            # 写入表头
            if data:
                headers = data[0].keys()
                csv_writer.writerow(headers)
                
                # 写入数据行
                for video in data:
                    csv_writer.writerow(video.values())
            
            output = si.getvalue()
            
            # 返回CSV响应
            from flask import Response
            return Response(
                output,
                mimetype="text/csv",
                headers={"Content-disposition": "attachment; filename=bilibrother_export.csv"}
            )
        
        # 默认返回JSON
        return jsonify(data)
    
    # 静态文件服务
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        """服务前端静态文件"""
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')
    
    return app
