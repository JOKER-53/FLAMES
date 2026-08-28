import sys

def reorder_file(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
        
    ai_start = -1
    kq_start = -1
    submit_start = -1
    
    for i, line in enumerate(lines):
        if '{(aiFeedback||loadingFeedback)' in line.replace(' ', ''):
            # check if previous line is a comment
            if '{/* AI Feedback */}' in lines[i-1]:
                ai_start = i - 1
            else:
                ai_start = i
                
        if 'Knowledge Check' in line and '<div' in line and 'fontSize' in line:
            # The knowledge check block starts a bit before
            # Usually '<div style={{ background:"#fff"'
            for j in range(i, i-10, -1):
                if '<div style={{ background:"#fff"' in lines[j]:
                    if '{/* Knowledge Check */}' in lines[j-1]:
                        kq_start = j - 1
                    else:
                        kq_start = j
                    break

        if 'Submit for Grading' in line and '<span' in line:
            for j in range(i, i-10, -1):
                if '<div style={{ background:"#fff"' in lines[j]:
                    if '{/* Submit */}' in lines[j-1]:
                        submit_start = j - 1
                    else:
                        submit_start = j
                    break

    if ai_start == -1 or kq_start == -1 or submit_start == -1:
        print(f"Could not find blocks in {filename}")
        return

    # In all these files, AI is before KQ, KQ is before Submit.
    # We find the end of Submit by looking for the next '        </div>' (the outer column div)
    # wait, the submit block ends at the closing div of the submit block.
    # Let's count divs for Submit block.
    submit_end = -1
    div_count = 0
    for i in range(submit_start, len(lines)):
        div_count += lines[i].count('<div') - lines[i].count('</div')
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
        f.writelines(new_lines)
        
    print(f"Success for {filename}")

reorder_file('packages/frontend/src/pages/pan/PanSecurityPolicy.tsx')
reorder_file('packages/frontend/src/pages/pan/PanNAT.tsx')
reorder_file('packages/frontend/src/pages/pan/PanZones.tsx')

