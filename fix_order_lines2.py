import sys

def reorder_file(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
        
    ai_start = -1
    kq_start = -1
    submit_start = -1
    
    for i, line in enumerate(lines):
        if '{(aiFeedback||loadingFeedback)' in line.replace(' ', ''):
            if i > 0 and '{/* AI Feedback */}' in lines[i-1]:
                ai_start = i - 1
            else:
                ai_start = i
                
        if 'Knowledge Check' in line and ('<div' in line or '<span' in line) and 'fontSize' in line:
            for j in range(i, max(-1, i-10), -1):
                if '<div style={{ background:"#fff"' in lines[j] or '<div style={{ background:"#fff",' in lines[j]:
                    if j > 0 and '{/* Knowledge Check */}' in lines[j-1]:
                        kq_start = j - 1
                    else:
                        kq_start = j
                    break

        if 'Submit for Grading' in line and '<span' in line:
            for j in range(i, max(-1, i-10), -1):
                if '<div style={{ background:"#fff"' in lines[j] or '<div style={{ background:"#fff",' in lines[j]:
                    if j > 0 and '{/* Submit */}' in lines[j-1]:
                        submit_start = j - 1
                    else:
                        submit_start = j
                    break

    if ai_start == -1 or kq_start == -1 or submit_start == -1:
        print(f"Could not find blocks in {filename}. ai={ai_start}, kq={kq_start}, submit={submit_start}")
        return

    submit_end = -1
    div_count = 0
    for i in range(submit_start, len(lines)):
        div_count += lines[i].count('<div') - lines[i].count('</div')
        # also count <> and </> ? No, only divs.
        if div_count == 0 and i > submit_start:
            submit_end = i + 1
            break
            
    if submit_end == -1:
        print(f"Could not find end of submit block in {filename}")
        return

    ai_block = lines[ai_start:kq_start]
    kq_block = lines[kq_start:submit_start]
    submit_block = lines[submit_start:submit_end]
    
    new_lines = lines[:ai_start] + submit_block + ['\n'] + ai_block + kq_block + lines[submit_end:]
    
    with open(filename, 'w') as f:
        f.write("".join(new_lines))
        
    print(f"Success for {filename}")

reorder_file('packages/frontend/src/pages/pan/PanNAT.tsx')
reorder_file('packages/frontend/src/pages/pan/PanZones.tsx')

