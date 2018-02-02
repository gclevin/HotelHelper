var start = document.getElementById('start');
var end = document.getElementById('end');

start.addEventListener('change', function() {
    if (start.value)
        end.min = start.value;
}, false);
end.addEventLiseter('change', function() {
    if (end.value)
        start.max = end.value;
}, false);