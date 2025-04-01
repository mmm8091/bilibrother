"""
数据库模型定义
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Video(db.Model):
    """视频数据模型"""
    id = db.Column(db.Integer, primary_key=True)
    bvid = db.Column(db.String(20), unique=True, nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    link = db.Column(db.String(200), nullable=False)
    view_count = db.Column(db.Integer, default=0)
    danmaku_count = db.Column(db.Integer, default=0)
    coin_count = db.Column(db.Integer, default=0)
    like_count = db.Column(db.Integer, default=0)
    share_count = db.Column(db.Integer, default=0)
    favorite_count = db.Column(db.Integer, default=0)
    tname = db.Column(db.String(50))
    cover_url = db.Column(db.String(200))
    duration = db.Column(db.Integer, default=0)
    follower_count = db.Column(db.Integer, default=0)
    historical_likes = db.Column(db.Integer, default=0)
    archive_count = db.Column(db.Integer, default=0)
    mid = db.Column(db.String(20))  # UP主ID
    author_name = db.Column(db.String(100))  # UP主名称
    last_updated = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        """将对象转换为字典"""
        return {
            'id': self.id,
            'bvid': self.bvid,
            'title': self.title,
            'link': self.link,
            'view_count': self.view_count,
            'danmaku_count': self.danmaku_count,
            'coin_count': self.coin_count,
            'like_count': self.like_count,
            'share_count': self.share_count,
            'favorite_count': self.favorite_count,
            'tname': self.tname,
            'cover_url': self.cover_url,
            'duration': self.duration,
            'follower_count': self.follower_count,
            'historical_likes': self.historical_likes,
            'archive_count': self.archive_count,
            'mid': self.mid,
            'author_name': self.author_name,
            'last_updated': self.last_updated.strftime('%Y-%m-%d %H:%M:%S')
        }

class Config(db.Model):
    """配置数据模型"""
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False, index=True)
    value = db.Column(db.Text, nullable=True)
    description = db.Column(db.String(200))
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        """将对象转换为字典"""
        return {
            'key': self.key,
            'value': self.value,
            'description': self.description,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        }
