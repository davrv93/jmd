package httpapi

import "testing"

func TestNormalizarPermitido(t *testing.T) {
	for in, quiere := range map[string]string{
		"+51 999 888 777":            "51999888777",
		"999888777":                  "51999888777",
		"51999888777@s.whatsapp.net": "51999888777",
		"123456789012345@lid":        "123456789012345@lid",
		"@juanito":                   "",
		"123":                        "",
		"120363@g.us":                "",
	} {
		if v, _ := normalizarPermitido(in); v != quiere {
			t.Errorf("%q → %q, quiero %q", in, v, quiere)
		}
	}
}

func TestPermitido(t *testing.T) {
	lista := []string{"51999888777", "777@lid"}
	casos := []struct {
		ids []string
		ok  bool
	}{
		{[]string{idDeJID("51999888777@s.whatsapp.net")}, true},
		{[]string{idDeJID("51999888777:12@s.whatsapp.net")}, true},
		{[]string{idDeJID("777@lid")}, true},
		{[]string{idDeJID("888@lid"), idDeJID("51999888777@s.whatsapp.net")}, true},
		{[]string{idDeJID("51911111111@s.whatsapp.net")}, false},
		{[]string{idDeJID("888@lid")}, false},
	}
	for _, c := range casos {
		if permitido(lista, c.ids) != c.ok {
			t.Errorf("%v: quiero %v", c.ids, c.ok)
		}
	}
	if permitido(nil, []string{"51999888777"}) {
		t.Error("lista vacía no deja pasar a nadie")
	}
}
