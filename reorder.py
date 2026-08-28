import re
import sys

def reorder_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # The AI Feedback block
    # It usually starts with "{(aiFeedback||loadingFeedback)" and ends with "  )}\n" or similar.
    # We will use regex to find the blocks.
    
    # 1. AI Feedback block
    ai_match = re.search(r'(?s)(\{\/\* AI Feedback \*\/\}[\n\s]*)?\{\(aiFeedback\|\|loadingFeedback\).*?\}\)\}', content)
    if not ai_match:
        ai_match = re.search(r'(?s)\{\(aiFeedback\|\|loadingFeedback\).*?\}\)\}', content)
    
    # 2. Knowledge Check block
    # Starts with {/* Knowledge Check */} or <div ...> Knowledge Check
    # We can match up to the end of the div.
    kq_match = re.search(r'(?s)(\{\/\* Knowledge Check \*\/\}[\n\s]*)?<div[^>]*>[\n\s]*<div[^>]*>[\n\s]*<(span|div)[^>]*>Knowledge Check<.*?</>\)}[\n\s]*</div>', content)
    
    # 3. Submit for Grading block
    # Starts with {/* Submit */} or <div ...> Submit for Grading
    submit_match = re.search(r'(?s)(\{\/\* Submit \*\/\}[\n\s]*)?<div[^>]*>[\n\s]*<div[^>]*>[\n\s]*<span[^>]*>Submit for Grading</span>.*?</div>[\n\s]*\)\}[\n\s]*</div>', content)
    
    print(f"{filename}: AI={bool(ai_match)}, KQ={bool(kq_match)}, Submit={bool(submit_match)}")

reorder_file('packages/frontend/src/pages/pan/PanSecurityPolicy.tsx')
reorder_file('packages/frontend/src/pages/pan/PanNAT.tsx')
reorder_file('packages/frontend/src/pages/pan/PanZones.tsx')
