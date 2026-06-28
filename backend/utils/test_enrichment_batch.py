"""Tests for batch IP enrichment (projector optimization path)."""

from unittest.mock import patch

from utils.enrichment import get_ip_enrichment_batch


@patch("utils.enrichment.get_ip_enrichment")
def test_batch_deduplicates_ips(mock_enrich):
  mock_enrich.side_effect = lambda ip: {"location": ip, "asn": "AS1", "isp": "ISP"}

  result = get_ip_enrichment_batch(["1.2.3.4", "1.2.3.4", "5.6.7.8", None])

  assert mock_enrich.call_count == 2
  assert result["1.2.3.4"]["location"] == "1.2.3.4"
  assert result["5.6.7.8"]["location"] == "5.6.7.8"
