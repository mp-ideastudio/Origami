const fs = require('fs');
const html = fs.readFileSync('NewOrigami.Panels.html', 'utf8');
const injection = `
<script>
setTimeout(() => {
    const gc = document.getElementById('guides-container');
    const ic = document.getElementById('input-container');
    const cards = document.querySelectorAll('.card-column');
    console.log("GC rect:", gc.getBoundingClientRect());
    console.log("IC rect:", ic.getBoundingClientRect());
    if (cards.length > 0) {
        console.log("First card left:", cards[0].getBoundingClientRect().left);
        console.log("Last card right:", cards[cards.length-1].getBoundingClientRect().right);
    }
}, 3000);
</script>
`;
if (!html.includes('GC rect')) {
    fs.writeFileSync('NewOrigami.Panels.html', html.replace('</body>', injection + '</body>'));
}
