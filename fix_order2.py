import re
import sys

def reorder(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # The AI Feedback starts with '          {/* AI Feedback */}' or '          {(aiFeedback||loadingFeedback) && ('
    # The Submit block ends with '          </div>\n        </div>' or similar.

    # Let's find the 3 blocks using very clear regex.
    # Block 1: AI Feedback
    ai_pattern = r'(\s*\{\/\* AI Feedback \*\/})?\s*\{\(aiFeedback\|\|loadingFeedback\)&&.*?\n\s*\}\)'
    if filename.endswith('PanSecurityPolicy.tsx'):
        ai_pattern = r'(\s*\{\/\* AI Feedback \*\/})?\s*\{\(aiFeedback\|\|loadingFeedback\) && \(\s*<div style=\{\{ background:"#fff7ed".*?\n\s*\}\)'
    
    ai_match = re.search(ai_pattern, content, flags=re.DOTALL)
    if not ai_match:
        print(f"AI block not found in {filename}")
        return

    ai_block = ai_match.group(0)

    # Block 2: Knowledge Check
    # It follows AI block
    kq_pattern = r'(\s*\{\/\* Knowledge Check \*\/})?\s*<div style=\{\{ background:"#fff", border:"1px solid #e2e8f0".*?Knowledge Check.*?Answer.*?\n\s*</div>'
    kq_match = re.search(kq_pattern, content[ai_match.end():], flags=re.DOTALL)
    if not kq_match:
        print(f"KQ block not found in {filename}")
        return
    
    kq_block = kq_match.group(0)

    # Block 3: Submit for Grading
    # It follows Knowledge Check
    submit_pattern = r'(\s*\{\/\* Submit \*\/})?\s*<div style=\{\{ background:"#fff", border:"1px solid #e2e8f0".*?Submit for Grading.*?\n\s*</div>'
    submit_match = re.search(submit_pattern, content[ai_match.end() + kq_match.end():], flags=re.DOTALL)
    if not submit_match:
        print(f"Submit block not found in {filename}")
        return

    submit_block = submit_match.group(0)

    # We want Submit -> AI -> KQ
    # Replace the whole chunk
    # Wait, the whole chunk is: ai_block + kq_block + submit_block
    start_idx = ai_match.start()
    end_idx = ai_match.end() + kq_match.end() + submit_match.end()
    
    # Check if they are contiguous
    chunk = content[start_idx:end_idx]
    if chunk.strip() != (ai_block + kq_block + submit_block).strip():
        # Maybe there are some newlines in between
        pass
    
    # A safer replacement: Replace all three with empty string, then insert them in order
    new_content = content.replace(ai_block, "")
    new_content = new_content.replace(kq_block, "")
    new_content = new_content.replace(submit_block, "")
    
    # We want to insert them where ai_block was
    insertion = submit_block + "\n" + ai_block + "\n" + kq_block
    
    new_content = new_content[:start_idx] + insertion + new_content[start_idx:]
    
    with open(filename, 'w') as f:
        f.write(new_content)
    print(f"Success for {filename}")

reorder('packages/frontend/src/pages/pan/PanSecurityPolicy.tsx')
reorder('packages/frontend/src/pages/pan/PanNAT.tsx')
reorder('packages/frontend/src/pages/pan/PanZones.tsx')

