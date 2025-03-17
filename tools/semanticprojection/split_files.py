import os

def split_embeddings_file(input_file, output_prefix, max_size_mb=95):
    """
    将词向量文件分割成多个小文件，每个文件不超过指定大小
    
    Args:
        input_file (str): 输入文件路径
        output_prefix (str): 输出文件前缀
        max_size_mb (int): 每个文件的最大大小（MB）
    """
    # 检查输入文件是否存在
    if not os.path.exists(input_file):
        print(f"错误：输入文件 {input_file} 不存在")
        return
    
    max_size_bytes = max_size_mb * 1024 * 1024  # 转换为字节
    current_file = 1
    current_size = 0
    current_lines = []
    
    print(f"开始分割文件: {input_file}")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            for line in f:
                line_size = len(line.encode('utf-8'))
                
                # 如果当前文件加上新行会超过大小限制，就写入当前文件并开始新文件
                if current_size + line_size > max_size_bytes and current_lines:
                    output_file = f"{output_prefix}_{current_file}.txt"
                    with open(output_file, 'w', encoding='utf-8') as f_out:
                        f_out.writelines(current_lines)
                    print(f"已写入文件: {output_file}, 包含 {len(current_lines)} 行")
                    
                    current_file += 1
                    current_size = 0
                    current_lines = []
                
                current_lines.append(line)
                current_size += line_size
        
        # 写入最后一个文件
        if current_lines:
            output_file = f"{output_prefix}_{current_file}.txt"
            with open(output_file, 'w', encoding='utf-8') as f_out:
                f_out.writelines(current_lines)
            print(f"已写入文件: {output_file}, 包含 {len(current_lines)} 行")
        
        print(f"分割完成，共生成 {current_file} 个文件")
    
    except Exception as e:
        print(f"处理文件 {input_file} 时发生错误: {str(e)}")

if __name__ == "__main__":
    # 获取当前脚本所在目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 分割三个词向量文件
    files_to_split = [
        (os.path.join(current_dir, 'wiki_filtered.txt'), 'wiki_filtered'),
        (os.path.join(current_dir, 'baiduw2v_filtered.txt'), 'baiduw2v_filtered'),
        (os.path.join(current_dir, 'merge_filtered.txt'), 'merge_filtered')
    ]
    
    for input_file, output_prefix in files_to_split:
        split_embeddings_file(input_file, output_prefix) 