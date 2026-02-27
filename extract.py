import json

html = open('tally_raw.html', encoding='utf-8').read()
s_tag = '<script id="__NEXT_DATA__" type="application/json">'
start = html.find(s_tag)
if start != -1:
    end = html.find('</script>', start)
    json_text = html[start+len(s_tag):end]
    data = json.loads(json_text)
    form_data = data['props']['pageProps']['form']
    with open('tally.json', 'w', encoding='utf-8') as f:
        json.dump(form_data, f, indent=2)
    print("Extracted to tally.json")
else:
    print("Tag not found")
