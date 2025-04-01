"""
BiliBrother 启动脚本
一键启动BiliBrother前后端应用程序
"""
import os
import sys
import subprocess
import time
import signal
import platform
import webbrowser
import threading
import shutil
import json
import logging
import atexit
from pathlib import Path

# 全局变量
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
IS_WINDOWS = platform.system() == "Windows"
PYTHON_CMD = "python" if IS_WINDOWS else "python3"
PIP_CMD = "pip" if IS_WINDOWS else "pip3"
NPM_CMD = "npm.cmd" if IS_WINDOWS else "npm"
processes = {
    "backend": None,
    "frontend": None,
}
START_BROWSER = True

# 日志配置
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("bilibrother_launcher.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("BiliBrother启动器")

# 控制台颜色
class Colors:
    HEADER = "\033[95m" if not IS_WINDOWS else ""
    BLUE = "\033[94m" if not IS_WINDOWS else ""
    GREEN = "\033[92m" if not IS_WINDOWS else ""
    WARNING = "\033[93m" if not IS_WINDOWS else ""
    FAIL = "\033[91m" if not IS_WINDOWS else ""
    ENDC = "\033[0m" if not IS_WINDOWS else ""
    BOLD = "\033[1m" if not IS_WINDOWS else ""
    UNDERLINE = "\033[4m" if not IS_WINDOWS else ""

def colorize(text, color):
    """为文本添加颜色"""
    return f"{color}{text}{Colors.ENDC}"

def print_header(text):
    """打印带有样式的标题"""
    width = 60
    print("\n" + "=" * width)
    print(colorize(text.center(width), Colors.BOLD + Colors.HEADER))
    print("=" * width + "\n")

def print_step(step, status=""):
    """打印步骤信息"""
    if status.lower() == "success":
        status_str = colorize("[成功]", Colors.GREEN)
    elif status.lower() == "fail":
        status_str = colorize("[失败]", Colors.FAIL)
    elif status.lower() == "skip":
        status_str = colorize("[跳过]", Colors.WARNING)
    elif status:
        status_str = colorize(f"[{status}]", Colors.BLUE)
    else:
        status_str = ""
    
    print(f"{colorize('>>>', Colors.BLUE)} {step} {status_str}")

def run_command(cmd, cwd=None, shell=False):
    """运行命令并返回结果"""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            shell=shell,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr
    except Exception as e:
        return False, str(e)

def check_dependencies():
    """检查是否安装了必要的依赖"""
    print_header("检查依赖")
    
    missing_deps = []
    
    # 检查Python依赖
    print_step("检查Python版本...")
    success, output = run_command([PYTHON_CMD, "--version"])
    if success:
        print_step("Python已安装", "success")
    else:
        print_step("Python未安装", "fail")
        missing_deps.append("Python 3.8+")
    
    # 检查pip
    print_step("检查pip...")
    success, output = run_command([PIP_CMD, "--version"])
    if success:
        print_step("pip已安装", "success")
    else:
        print_step("pip未安装", "fail")
        missing_deps.append("pip")
    
    # 检查Node.js
    print_step("检查Node.js...")
    success, output = run_command(["node", "--version"])
    if success:
        print_step("Node.js已安装", "success")
    else:
        print_step("Node.js未安装", "fail")
        missing_deps.append("Node.js 14+")
    
    # 检查npm
    print_step("检查npm...")
    success, output = run_command([NPM_CMD, "--version"])
    if success:
        print_step("npm已安装", "success")
    else:
        print_step("npm未安装", "fail")
        missing_deps.append("npm")
    
    # 检查Flask依赖
    print_step("检查Flask依赖...")
    required_python_packages = ["flask", "flask_cors", "flask_sqlalchemy"]
    missing_python_packages = []
    
    for package in required_python_packages:
        success, _ = run_command(
            [PYTHON_CMD, "-c", f"import {package}"],
            shell=IS_WINDOWS
        )
        if not success:
            missing_python_packages.append(package)
    
    if missing_python_packages:
        print_step(f"缺少Python包: {', '.join(missing_python_packages)}", "fail")
        missing_deps.append(f"Python包: {', '.join(missing_python_packages)}")
    else:
        print_step("Flask依赖已安装", "success")
    
    # 检查前端依赖
    frontend_path = Path("bilibrother_app/frontend")
    print_step("检查前端依赖...")
    
    if not (frontend_path / "node_modules").exists():
        print_step("尚未安装前端依赖", "fail")
        missing_deps.append("前端依赖")
    else:
        print_step("前端依赖已安装", "success")
    
    # 返回检查结果
    return missing_deps

def install_dependencies(missing_deps):
    """安装缺失的依赖"""
    print_header("安装依赖")
    
    if "前端依赖" in missing_deps:
        print_step("安装前端依赖...")
        frontend_path = Path("bilibrother_app/frontend")
        success, output = run_command(
            [NPM_CMD, "install"],
            cwd=frontend_path
        )
        if success:
            print_step("前端依赖安装完成", "success")
        else:
            print_step("前端依赖安装失败", "fail")
            print(output)
            return False
    
    python_packages = []
    for dep in missing_deps:
        if dep.startswith("Python包:"):
            packages = dep.replace("Python包:", "").strip().split(", ")
            python_packages.extend(packages)
    
    if python_packages:
        print_step(f"安装缺失的Python包: {', '.join(python_packages)}...")
        success, output = run_command(
            [PIP_CMD, "install"] + python_packages
        )
        if success:
            print_step("Python包安装完成", "success")
        else:
            print_step("Python包安装失败", "fail")
            print(output)
            return False
    
    return True

def start_backend():
    """启动后端服务"""
    print_step("启动后端API服务...")
    
    # 确保数据目录存在
    data_dir = Path("bilibrother_app/data")
    data_dir.mkdir(exist_ok=True, parents=True)
    
    # 检查是否存在配置文件，如果存在则复制到data目录
    config_properties = Path("config.properties")
    if config_properties.exists():
        shutil.copy(config_properties, data_dir / "config.properties")
        print_step("已复制配置文件到数据目录", "success")
    
    # 创建启动脚本
    backend_script = """
from bilibrother_app.backend.api import create_app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000, debug=True)
"""

    with open("run_backend.py", "w", encoding="utf-8") as f:
        f.write(backend_script)
    
    # 启动后端服务
    if IS_WINDOWS:
        backend_process = subprocess.Popen(
            [PYTHON_CMD, "run_backend.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
        )
    else:
        backend_process = subprocess.Popen(
            [PYTHON_CMD, "run_backend.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            preexec_fn=os.setsid
        )
    
    processes["backend"] = backend_process
    
    # 等待服务启动
    time.sleep(2)
    
    # 检查服务是否已启动
    if backend_process.poll() is None:
        print_step("后端API服务已启动", "success")
        # 启动日志打印线程
        threading.Thread(
            target=log_process_output,
            args=(backend_process, "后端"),
            daemon=True
        ).start()
        return True
    else:
        print_step("后端API服务启动失败", "fail")
        try:
            output = backend_process.communicate(timeout=1)[0]
            print(output)
        except:
            pass
        return False

def start_frontend():
    """启动前端服务"""
    print_step("启动前端开发服务器...")
    
    frontend_path = Path("bilibrother_app/frontend")
    
    # 检查是否已安装前端依赖
    if not (frontend_path / "node_modules").exists():
        print_step("安装前端依赖...")
        success, output = run_command(
            [NPM_CMD, "install"],
            cwd=frontend_path
        )
        if not success:
            print_step("前端依赖安装失败", "fail")
            print(output)
            return False
    
    # 启动前端服务
    if IS_WINDOWS:
        frontend_process = subprocess.Popen(
            [NPM_CMD, "start"],
            cwd=frontend_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
        )
    else:
        frontend_process = subprocess.Popen(
            [NPM_CMD, "start"],
            cwd=frontend_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            preexec_fn=os.setsid
        )
    
    processes["frontend"] = frontend_process
    
    # 等待服务启动
    time.sleep(5)
    
    # 检查服务是否已启动
    if frontend_process.poll() is None:
        print_step("前端开发服务器已启动", "success")
        # 启动日志打印线程
        threading.Thread(
            target=log_process_output,
            args=(frontend_process, "前端"),
            daemon=True
        ).start()
        return True
    else:
        print_step("前端开发服务器启动失败", "fail")
        try:
            output = frontend_process.communicate(timeout=1)[0]
            print(output)
        except:
            pass
        return False

def log_process_output(process, name):
    """实时打印进程输出"""
    prefix = colorize(f"[{name}]", Colors.BOLD + Colors.BLUE)
    
    while process.poll() is None:
        try:
            line = process.stdout.readline().strip()
            if line:
                print(f"{prefix} {line}")
        except:
            break

def open_browser():
    """在浏览器中打开应用"""
    url = "http://localhost:3000"
    print_step(f"在浏览器中打开应用: {url}...")
    webbrowser.open(url)

def cleanup():
    """清理资源并停止所有服务"""
    print_header("正在停止服务")
    
    for name, process in processes.items():
        if process and process.poll() is None:
            print_step(f"正在停止{name}服务...")
            try:
                if IS_WINDOWS:
                    process.send_signal(signal.CTRL_BREAK_EVENT)
                else:
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                process.wait(timeout=5)
                print_step(f"{name}服务已停止", "success")
            except:
                print_step(f"强制终止{name}服务...")
                try:
                    process.kill()
                    print_step(f"{name}服务已强制终止", "success")
                except:
                    print_step(f"无法终止{name}服务", "fail")
    
    print_step("清理临时文件...")
    try:
        if os.path.exists("run_backend.py"):
            os.remove("run_backend.py")
    except:
        pass
    
    print_step("所有服务已停止", "success")

def main():
    """主函数"""
    print_header("欢迎使用 BiliBrother 启动器")
    print("项目: B站视频数据监控工具")
    print(f"时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"系统: {platform.system()} {platform.release()}")
    print("\n按 Ctrl+C 可随时退出程序\n")
    
    # 确保在正确的目录中运行
    if not os.path.exists("bilibrother_app"):
        print_step("错误: 请在BiliBrother项目根目录中运行此脚本!", "fail")
        return
    
    # 检查依赖
    missing_deps = check_dependencies()
    if missing_deps:
        print_step(f"缺少依赖: {', '.join(missing_deps)}", "fail")
        choice = input("是否尝试安装缺失的依赖? (y/n): ").strip().lower()
        if choice == 'y':
            if not install_dependencies(missing_deps):
                print_step("依赖安装失败，请手动安装后重试", "fail")
                return
        else:
            print_step("请手动安装缺失的依赖后重试", "fail")
            return
    
    # 注册退出处理
    atexit.register(cleanup)
    
    # 启动后端
    if not start_backend():
        print_step("后端启动失败，程序退出", "fail")
        return
    
    # 启动前端
    if not start_frontend():
        print_step("前端启动失败，程序退出", "fail")
        return
    
    global START_BROWSER
    # 打开浏览器
    time.sleep(2)
    if START_BROWSER:
        open_browser()
        START_BROWSER = False
    
    print_header("BiliBrother 已成功启动")
    print("后端API地址: http://localhost:10000")
    print("前端访问地址: http://localhost:3000")
    print("\n按 Ctrl+C 可停止所有服务\n")
    
    try:
        # 保持程序运行
        while True:
            time.sleep(1)
            # 检查进程是否仍在运行
            if (processes["backend"] and processes["backend"].poll() is not None) or \
               (processes["frontend"] and processes["frontend"].poll() is not None):
                print_step("服务意外终止，正在关闭程序...", "fail")
                break
    except KeyboardInterrupt:
        print("\n接收到退出信号，正在关闭...")
    finally:
        cleanup()

if __name__ == "__main__":
    main()
