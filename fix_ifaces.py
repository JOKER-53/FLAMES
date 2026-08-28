import sys

def reorder_ifaces(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
        
    ai_start = -1
    kq_start = -1
    kq_end = -1
    
    for i, line in enumerate(lines):
        if '{(aiFeedback||loadingFeedback)' in line.replace(' ', ''):
            ai_start = i
        if 'Knowledge Check' in line and '<div' in line and 'fontSize' in line:
            for j in range(i, max(-1, i-10), -1):
                if '<div style={{ background:"#fff"' in lines[j]:
                    kq_start = j
                    break

    if ai_start == -1 or kq_start == -1:
        print("Not found")
        return

    div_count = 0
    for i in range(kq_start, len(lines)):
        div_count += lines[i].count('<div') - lines[i].count('</div')
        if div_count == 0 and i > kq_start:
            kq_end = i + 1
            break
            
    # Remove AI and KQ from right column
    ai_kq_block = lines[ai_start:kq_end]
    new_lines = lines[:ai_start] + lines[kq_end:]
    
    # Now find the end of Submit block on the left
    submit_idx = -1
    for i, line in enumerate(new_lines):
        if 'Submit for Grading' in line and '<span' in line:
            submit_idx = i
            break
            
    submit_end = -1
    if submit_idx != -1:
        submit_start = -1
        for j in range(submit_idx, max(-1, submit_idx-10), -1):
            if '<div style={{ background:"#fff"' in new_lines[j]:
                submit_start = j
                break
        div_count = 0
        for i in range(submit_start, len(new_lines)):
            div_count += new_lines[i].count('<div') - new_lines[i].count('</div')
            if div_count == 0 and i > submit_start:
                submit_end = i + 1
                break
                
    if submit_end != -1:
        new_lines = new_lines[:submit_end] + ['\n'] + ai_kq_block + new_lines[submit_end:]
        with open(filename, 'w') as f:
            f.write("".join(new_lines))
        print("Success for PanInterfaces.tsx")

reorder_ifaces('packages/frontend/src/pages/pan/PanInterfaces.tsx')
