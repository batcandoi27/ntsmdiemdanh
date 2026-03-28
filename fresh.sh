#!/bin/bash
echo "Dọn dẹp cổng 8888..."
PIDS=$(netstat -ano | findstr :8888 | awk '{print $5}' | sort -u)
if [ -z "$PIDS" ]; then
    echo "Cổng 8888 đã trống."
else
    for pid in $PIDS; do
        echo "Killing PID: $pid"
        taskkill -F -PID $pid /T 2>/dev/null || true
    done
    echo "Đã giải phóng cổng 8888."
fi
