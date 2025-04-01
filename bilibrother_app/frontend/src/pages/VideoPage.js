import React, { useState, useEffect } from 'react';
import {
  Table, Button, Card, Input, Modal, message, Tooltip, Popconfirm, Tag, Image, Space, Typography, Row, Col, Statistic, Spin
} from 'antd';
import {
  PlusOutlined, 
  ReloadOutlined, 
  DeleteOutlined, 
  ExportOutlined,
  InfoCircleOutlined,
  VideoCameraOutlined
} from '@ant-design/icons';
import { fetchVideos, addVideo, deleteVideo, refreshVideos, exportData } from '../services/api';

const { Title, Text } = Typography;
const { Search } = Input;

function VideoPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newBVID, setNewBVID] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  

  // 格式化数字，添加千位分隔符
  const formatNumber = (num) => {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0';
  };

  // 获取视频列表
  const loadVideos = async () => {
    setLoading(true);
    try {
      const data = await fetchVideos();
      setVideos(data);
    } catch (error) {
      message.error('获取视频列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 首次加载
  useEffect(() => {
    loadVideos();
  }, []);

  // 添加新视频
  const handleAddVideo = async () => {
    if (!newBVID || !newBVID.trim()) {
      message.warning('请输入有效的BV号');
      return;
    }

    // 提取BV号，处理带链接的情况
    let bvid = newBVID.trim();
    if (bvid.includes('/')) {
      const match = bvid.match(/BV\w+/);
      if (match) {
        bvid = match[0];
      }
    }

    setLoading(true);
    try {
      await addVideo(bvid);
      message.success(`成功添加视频: ${bvid}`);
      setAddModalVisible(false);
      setNewBVID('');
      loadVideos();
    } catch (error) {
      const errorMsg = error.response?.data?.error || '添加视频失败';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 删除视频
  const handleDeleteVideo = async (bvid) => {
    setLoading(true);
    try {
      await deleteVideo(bvid);
      message.success(`成功删除视频: ${bvid}`);
      loadVideos();
    } catch (error) {
      message.error(`删除视频失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 刷新所有视频数据
  const handleRefreshAll = async () => {
    setRefreshLoading(true);
    try {
      const result = await refreshVideos();
      message.success(result.message);
      loadVideos();
    } catch (error) {
      message.error('刷新视频数据失败');
    } finally {
      setRefreshLoading(false);
    }
  };

  // 刷新选中视频数据
  const handleRefreshSelected = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请至少选择一个视频');
      return;
    }

    setRefreshLoading(true);
    try {
      const result = await refreshVideos(selectedRowKeys);
      message.success(result.message);
      loadVideos();
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('刷新视频数据失败');
    } finally {
      setRefreshLoading(false);
    }
  };

  // 导出数据
  const handleExportData = async () => {
    setLoading(true);
    try {
      // 创建导出选项的弹窗
      Modal.confirm({
        title: '选择导出格式',
        content: '请选择导出数据的格式',
        okText: 'JSON格式',
        cancelText: 'CSV格式',
        onOk: async () => {
          // 导出JSON
          try {
            setLoading(true);
            const data = await exportData('json');
            
            // 创建JSON文件并下载
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `bilibrother_export_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            message.success('JSON数据导出成功');
          } catch (error) {
            message.error('导出JSON数据失败');
          } finally {
            setLoading(false);
          }
        },
        onCancel: async () => {
          // 导出CSV
          try {
            setLoading(true);
            const response = await exportData('csv');
            
            // 从响应头获取文件名
            const contentDisposition = response.headers['content-disposition'];
            let filename = `bilibrother_export_${new Date().toISOString().split('T')[0]}.csv`;
            
            if (contentDisposition) {
              const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
              if (fileNameMatch?.length === 2) {
                filename = fileNameMatch[1];
              }
            }
            
            // 创建CSV文件并下载
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            
            URL.revokeObjectURL(url);
            message.success('CSV数据导出成功');
          } catch (error) {
            message.error('导出CSV数据失败');
          } finally {
            setLoading(false);
          }
        }
      });
    } catch (error) {
      message.error('导出数据操作失败');
      setLoading(false);
    }
  };

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys) => {
      setSelectedRowKeys(newSelectedRowKeys);
    }
  };

  // 计算汇总数据
  const getTotalStats = () => {
    if (!videos || videos.length === 0) return { views: 0, likes: 0, coins: 0, favorites: 0 };
    
    return videos.reduce((acc, video) => {
      return {
        views: acc.views + video.view_count,
        likes: acc.likes + video.like_count,
        coins: acc.coins + video.coin_count,
        favorites: acc.favorites + video.favorite_count
      };
    }, { views: 0, likes: 0, coins: 0, favorites: 0 });
  };

  const totalStats = getTotalStats();

  // 表格列定义
  const columns = [
    {
      title: 'BV号',
      dataIndex: 'bvid',
      key: 'bvid',
      fixed: 'left',
      width: 120,
      render: (bvid) => (
        <a href={`https://www.bilibili.com/video/${bvid}`} target="_blank" rel="noopener noreferrer">
          {bvid}
        </a>
      ),
    },
    {
      title: '封面',
      dataIndex: 'cover_url',
      key: 'cover',
      width: 120,
      render: (url) => (
        <div style={{ width: 100, height: 56 }}>
          {url ? (
            <Image
              src={`/api/image-proxy?url=${encodeURIComponent(url)}`}
              width={100}
              height={56}
              style={{ 
                objectFit: 'cover',
                borderRadius: 4
              }}
              placeholder={
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Spin size="small" />
                </div>
              }
              fallback={
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999'
                }}>
                  加载失败
                </div>
              }
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999'
            }}>
              无封面
            </div>
          )}
        </div>
      )
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: 300,
      render: (title, record) => (
        <Tooltip title={title} placement="topLeft">
          <a href={record.link} target="_blank" rel="noopener noreferrer">
            {title}
          </a>
        </Tooltip>
      ),
    },
    {
      title: 'UP主',
      dataIndex: 'author_name',
      key: 'author_name',
      width: 120,
      render: (name, record) => (
        <a href={`https://space.bilibili.com/${record.mid}`} target="_blank" rel="noopener noreferrer">
          {name || '未知UP主'}
        </a>
      ),
    },
    {
      title: '播放量',
      dataIndex: 'view_count',
      key: 'view_count',
      width: 100,
      sorter: (a, b) => a.view_count - b.view_count,
      render: (count) => formatNumber(count),
    },
    {
      title: '点赞数',
      dataIndex: 'like_count',
      key: 'like_count',
      width: 100,
      sorter: (a, b) => a.like_count - b.like_count,
      render: (count) => formatNumber(count),
    },
    {
      title: '投币数',
      dataIndex: 'coin_count',
      key: 'coin_count',
      width: 100,
      sorter: (a, b) => a.coin_count - b.coin_count,
      render: (count) => formatNumber(count),
    },
    {
      title: '收藏数',
      dataIndex: 'favorite_count',
      key: 'favorite_count',
      width: 100,
      sorter: (a, b) => a.favorite_count - b.favorite_count,
      render: (count) => formatNumber(count),
    },
    {
      title: '弹幕量',
      dataIndex: 'danmaku_count',
      key: 'danmaku_count',
      width: 100,
      sorter: (a, b) => a.danmaku_count - b.danmaku_count,
      render: (count) => formatNumber(count),
    },
    {
      title: '分区',
      dataIndex: 'tname',
      key: 'tname',
      width: 100,
      render: (tname) => <Tag color="blue">{tname}</Tag>,
    },
    {
      title: '粉丝数',
      dataIndex: 'follower_count',
      key: 'follower_count',
      width: 120,
      sorter: (a, b) => a.follower_count - b.follower_count,
      render: (count) => formatNumber(count),
    },
    {
      title: '历史点赞',
      dataIndex: 'historical_likes',
      key: 'historical_likes',
      width: 120,
      sorter: (a, b) => a.historical_likes - b.historical_likes,
      render: (count) => formatNumber(count),
    },
    {
      title: 'UP主稿件数',
      dataIndex: 'archive_count',
      key: 'archive_count',
      width: 120,
      sorter: (a, b) => a.archive_count - b.archive_count,
      render: (count) => formatNumber(count),
    },
    {
      title: '更新时间',
      dataIndex: 'last_updated',
      key: 'last_updated',
      width: 160,
      render: (time) => (
        <Tooltip title={`最后更新: ${time}`}>
          {time}
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="确定要删除这个视频吗?"
          onConfirm={() => handleDeleteVideo(record.bvid)}
          okText="是"
          cancelText="否"
        >
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>视频数据监控</Title>
      
      {/* 统计卡片 */}
      <Card className="card-container">
        <Row gutter={16}>
          <Col xs={12} sm={12} md={6} lg={6}>
            <Statistic 
              title="总视频数" 
              value={videos.length} 
              prefix={<VideoCameraOutlined />} 
            />
          </Col>
          <Col xs={12} sm={12} md={6} lg={6}>
            <Statistic 
              title="总播放量" 
              value={totalStats.views} 
              formatter={(value) => formatNumber(value)}
            />
          </Col>
          <Col xs={12} sm={12} md={6} lg={6}>
            <Statistic 
              title="总点赞数" 
              value={totalStats.likes} 
              formatter={(value) => formatNumber(value)}
            />
          </Col>
          <Col xs={12} sm={12} md={6} lg={6}>
            <Statistic 
              title="总收藏数" 
              value={totalStats.favorites} 
              formatter={(value) => formatNumber(value)}
            />
          </Col>
        </Row>
      </Card>
      
      {/* 工具栏 */}
      <Card className="card-container">
        <div className="table-actions">
          <Space wrap>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setAddModalVisible(true)}
            >
              添加视频
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefreshAll}
              loading={refreshLoading}
            >
              刷新所有数据
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefreshSelected}
              loading={refreshLoading}
              disabled={selectedRowKeys.length === 0}
            >
              刷新选中数据
            </Button>
            <Button 
              icon={<ExportOutlined />} 
              onClick={handleExportData}
            >
              导出数据
            </Button>
          </Space>
          
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">
              <InfoCircleOutlined /> 选中 {selectedRowKeys.length} 个视频
            </Text>
          </div>
        </div>
      </Card>
      
      {/* 视频表格 */}
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={videos}
        rowKey="bvid"
        loading={loading}
        pagination={{ 
          pageSize: 10,
          showTotal: (total) => `共 ${total} 个视频`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        scroll={{ x: 1300 }}
      />
      
      {/* 添加视频弹窗 */}
      <Modal
        title="添加视频"
        open={addModalVisible}
        onOk={handleAddVideo}
        onCancel={() => {
          setAddModalVisible(false);
          setNewBVID('');
        }}
        confirmLoading={loading}
      >
        <div style={{ marginBottom: 16 }}>
          <p>请输入B站视频BV号或完整链接：</p>
          <Search
            placeholder="例如: BV1GJ411x7h7 或 https://www.bilibili.com/video/BV1GJ411x7h7"
            enterButton="验证"
            value={newBVID}
            onChange={(e) => setNewBVID(e.target.value)}
            onSearch={handleAddVideo}
          />
        </div>
        <p style={{ color: 'rgba(0, 0, 0, 0.45)' }}>
          <InfoCircleOutlined /> 可直接粘贴B站视频页面的链接
        </p>
      </Modal>
    </div>
  );
}

export default VideoPage;
