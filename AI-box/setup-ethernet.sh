#!/usr/bin/env bash
set -e

# =========================
# config
# =========================
IFACE_NAME=""                # auto detect
STATIC_IP="192.168.100.2/24"
GATEWAY_IP=""
DNS_IP="8.8.8.8"

echo "[AI-BOX] Setting up Ethernet networking..."

# =========================
# auto detect USB Ethernet
# =========================
if [[ -z "$IFACE_NAME" ]]; then
  IFACE_NAME=$(ip -o link show | awk -F': ' '{print $2}' | grep -E 'enx|eth' | head -n1)
fi

if [[ -z "$IFACE_NAME" ]]; then
  echo "[ERROR] No Ethernet interface found"
  exit 1
fi

echo "[AI-BOX] Using interface: $IFACE_NAME"

# =========================
# cleanup old IP
# =========================
sudo ip addr flush dev "$IFACE_NAME"

# =========================
# set static IP
# =========================
sudo ip addr add "$STATIC_IP" dev "$IFACE_NAME"
sudo ip link set "$IFACE_NAME" up

# =========================
# DNS
# =========================
if ! grep -q "$DNS_IP" /etc/resolv.conf; then
  echo "nameserver $DNS_IP" | sudo tee -a /etc/resolv.conf > /dev/null
fi

# =========================
# UFW
# =========================
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow 8080/tcp || true
  sudo ufw allow from 192.168.100.0/24 || true
fi

echo "[AI-BOX] Network ready:"
ip addr show "$IFACE_NAME"
