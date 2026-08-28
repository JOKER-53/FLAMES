import re

for filename in ['packages/frontend/src/pages/pan/PanSecurityPolicy.tsx', 'packages/frontend/src/pages/pan/PanNAT.tsx', 'packages/frontend/src/pages/pan/PanZones.tsx']:
    with open(filename, 'r') as f:
        content = f.read()
    
    # In all three files, they are in the order:
    # 1. AI Feedback
    # 2. Knowledge Check
    # 3. Submit
    # They are wrapped in a <div> ... </div> (the left column)
    
    # We want: Submit, AI Feedback, Knowledge Check.
    
    # The AI Feedback starts with "{(aiFeedback||loadingFeedback)" (with or without comment)
    # The Knowledge Check ends with a closing div just before the Submit block.
    # The Submit block ends with a closing div.
    
    # I will split the text manually based on these known anchors.
    # Let's find "{(aiFeedback||loadingFeedback)"
    ai_start = content.find("{(aiFeedback||loadingFeedback)")
    if ai_start == -1:
        print(f"Skipping {filename} - aiFeedback not found")
        continue
        
    # Sometimes there's a comment {/* AI Feedback */} before it.
    comment_ai = content.rfind("{/* AI Feedback */}", 0, ai_start)
    if comment_ai != -1 and (ai_start - comment_ai) < 50:
        ai_start = comment_ai

    # Let's find "Submit for Grading"
    submit_str = "Submit for Grading</span>"
    submit_idx = content.find(submit_str)
    
    # The Submit block starts a few lines before submit_idx.
    # Let's look for "<div style={{ background:"#fff"" just before submit_idx
    submit_start = content.rfind("<div style={{ background:", 0, submit_idx)
    
    comment_submit = content.rfind("{/* Submit */}", 0, submit_start)
    if comment_submit != -1 and (submit_start - comment_submit) < 50:
        submit_start = comment_submit

    # The end of the Submit block is the end of its div.
    # We can find it by looking for the next closing div after results.map
    # Actually, in PanSecurityPolicy, it ends right before "        </div>\n\n        {/* Right:"
    end_of_submit = content.find("        </div>", submit_idx)
    
    ai_and_kq_block = content[ai_start:submit_start]
    submit_block = content[submit_start:end_of_submit]
    
    # Now swap them
    new_content = content[:ai_start] + submit_block + "\n" + ai_and_kq_block + content[end_of_submit:]
    
    with open(filename, 'w') as f:
        f.write(new_content)
    
    print(f"Fixed {filename}")
